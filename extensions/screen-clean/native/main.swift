import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

// MARK: - Options

private struct Options {
    var seconds: TimeInterval = 60
    var lockKeyboard = false
    var showHint = true
    var requestAccessibilityOnly = false
}

private let escapePressTarget = 5
private let escapeSequenceTimeout: TimeInterval = 2
private let idleSessionHardLimit: TimeInterval = 30 * 60

private func usage() -> String {
    """
    ScreenCleaner — full-screen black overlay for cleaning your screen and keyboard.

    Usage: ScreenCleaner [options]

      --seconds <n>            Auto-exit after n seconds (0 = until stopped, hard-capped at 30 min)
      --lock-keyboard          Swallow keyboard events system-wide (needs Accessibility permission)
      --no-hint                Do not show the exit hint
      --request-accessibility  Ask macOS for Accessibility permission, then exit
      -h, --help               Show this help
    """
}

private func parseOptions() -> Options {
    var options = Options()
    var index = 1
    let arguments = CommandLine.arguments

    while index < arguments.count {
        switch arguments[index] {
        case "--seconds":
            index += 1
            if index < arguments.count, let value = Double(arguments[index]) {
                options.seconds = max(0, value)
            }
        case "--lock-keyboard":
            options.lockKeyboard = true
        case "--no-hint":
            options.showHint = false
        case "--request-accessibility":
            options.requestAccessibilityOnly = true
        case "-h", "--help":
            print(usage())
            exit(0)
        default:
            fputs("Unknown option: \(arguments[index])\n\(usage())\n", stderr)
            exit(2)
        }
        index += 1
    }

    return options
}

// MARK: - Accessibility

private func isAccessibilityTrusted(prompt: Bool) -> Bool {
    let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
    return AXIsProcessTrustedWithOptions([key: prompt] as CFDictionary)
}

// MARK: - Views

private final class OverlayView: NSView {
    var onMouseDown: (() -> Void)?

    override var acceptsFirstResponder: Bool { true }

    override func mouseDown(with event: NSEvent) {
        onMouseDown?()
    }
}

private final class OverlayWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

// MARK: - Controller

private final class CleanerController: NSObject, NSApplicationDelegate {
    private let options: Options

    private var windows: [NSWindow] = []
    private var hintLabels: [NSTextField] = []
    private var hintHideWorkItem: DispatchWorkItem?

    private var localKeyMonitor: Any?
    private var eventTap: CFMachPort?
    private var eventTapSource: CFRunLoopSource?
    private var strictKeyboardLockActive = false

    private var escapePressCount = 0
    private var escapeSequenceResetWorkItem: DispatchWorkItem?
    private var autoExitTimer: Timer?
    private var activity: NSObjectProtocol?
    private var signalSources: [DispatchSourceSignal] = []

    private var isExiting = false
    private var baseHintText = ""

    init(options: Options) {
        self.options = options
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        activity = ProcessInfo.processInfo.beginActivity(
            options: [.idleDisplaySleepDisabled, .userInitiatedAllowingIdleSystemSleep],
            reason: "Screen cleaning mode"
        )

        if options.lockKeyboard {
            strictKeyboardLockActive = installEventTap()
        }

        installLocalKeyMonitor()
        installSignalHandlers()

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(screenParametersChanged),
            name: NSApplication.didChangeScreenParametersNotification,
            object: nil
        )

        buildWindows(animated: true)
        scheduleAutoExit()

        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if isExiting { return .terminateNow }
        finish()
        return .terminateCancel
    }

    // MARK: Windows

    private func buildWindows(animated: Bool) {
        for window in windows {
            window.orderOut(nil)
            window.close()
        }
        windows.removeAll()
        hintLabels.removeAll()

        let hint = initialHintText()

        for screen in NSScreen.screens {
            let frame = NSRect(origin: .zero, size: screen.frame.size)
            let window = OverlayWindow(
                contentRect: screen.frame,
                styleMask: [.borderless],
                backing: .buffered,
                defer: false,
                screen: screen
            )

            window.setFrame(screen.frame, display: true)
            window.level = NSWindow.Level(rawValue: Int(CGShieldingWindowLevel()))
            window.collectionBehavior = [
                .canJoinAllSpaces,
                .stationary,
                .fullScreenAuxiliary,
                .ignoresCycle,
            ]
            window.backgroundColor = .black
            window.isOpaque = true
            window.hasShadow = false
            window.isReleasedWhenClosed = false
            window.animationBehavior = .none

            let contentView = OverlayView(frame: frame)
            contentView.wantsLayer = true
            contentView.layer?.backgroundColor = NSColor.black.cgColor
            contentView.onMouseDown = { [weak self] in
                self?.showTransientHint()
            }
            window.contentView = contentView

            window.alphaValue = animated ? 0 : 1
            window.makeKeyAndOrderFront(nil)
            windows.append(window)

            if !hint.isEmpty {
                addHint(hint, to: window, alpha: 0.32)
            } else {
                // Keep an invisible label around so the Esc press counter can be shown.
                addHint("", to: window, alpha: 0)
            }

            if animated {
                NSAnimationContext.runAnimationGroup { context in
                    context.duration = 0.25
                    window.animator().alphaValue = 1
                }
            }
        }

        if escapePressCount > 0 {
            showEscapeProgress()
        } else if !hint.isEmpty {
            scheduleHintFade(after: 4)
        }
    }

    private func initialHintText() -> String {
        guard options.showHint else { return "" }

        var text = "Cleaning mode — press Esc 5 times to exit"
        if options.lockKeyboard && !strictKeyboardLockActive {
            text = "Keyboard lock unavailable (grant Accessibility) — press Esc 5 times to exit"
        } else if options.seconds == 0 {
            text = "Cleaning mode (max 30 min) — press Esc 5 times to exit"
        }
        baseHintText = text
        return text
    }

    private func addHint(_ text: String, to window: NSWindow, alpha: CGFloat) {
        let label = NSTextField(labelWithString: text)
        label.font = .systemFont(ofSize: 18, weight: .medium)
        label.textColor = .white
        label.alignment = .center
        label.alphaValue = alpha
        label.translatesAutoresizingMaskIntoConstraints = false

        guard let contentView = window.contentView else { return }
        contentView.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
        ])
        hintLabels.append(label)
    }

    @objc private func screenParametersChanged() {
        buildWindows(animated: false)
    }

    // MARK: Hint

    private func setHint(_ text: String, alpha: CGFloat, fadeAfter: TimeInterval?) {
        hintHideWorkItem?.cancel()
        hintHideWorkItem = nil

        for label in hintLabels {
            label.stringValue = text
            label.alphaValue = alpha
        }

        if let fadeAfter {
            scheduleHintFade(after: fadeAfter)
        }
    }

    private func scheduleHintFade(after delay: TimeInterval) {
        hintHideWorkItem?.cancel()
        let item = DispatchWorkItem { [weak self] in
            guard let self else { return }
            for label in self.hintLabels {
                NSAnimationContext.runAnimationGroup { context in
                    context.duration = 1
                    label.animator().alphaValue = 0
                }
            }
        }
        hintHideWorkItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: item)
    }

    private func showEscapeProgress() {
        guard !hintLabels.isEmpty else { return }
        setHint(
            "Press Esc 5 times to exit · \(escapePressCount)/\(escapePressTarget)",
            alpha: 0.8,
            fadeAfter: nil
        )
    }

    private func showTransientHint() {
        guard options.showHint else { return }
        let text = baseHintText.isEmpty ? "Press Esc 5 times to exit" : baseHintText
        setHint(text, alpha: 0.32, fadeAfter: 3)
    }

    private func resetEscapePressCount() {
        guard !isExiting else { return }
        escapePressCount = 0
        escapeSequenceResetWorkItem = nil

        if baseHintText.isEmpty {
            setHint("", alpha: 0, fadeAfter: nil)
        } else {
            setHint(baseHintText, alpha: 0.32, fadeAfter: 1.5)
        }
    }

    // MARK: Exit

    private func scheduleAutoExit() {
        let interval = options.seconds > 0 ? options.seconds : idleSessionHardLimit
        autoExitTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: false) { [weak self] _ in
            self?.finish()
        }
    }

    private func finish() {
        guard !isExiting else { return }
        isExiting = true

        autoExitTimer?.invalidate()
        autoExitTimer = nil
        hintHideWorkItem?.cancel()
        hintHideWorkItem = nil
        escapeSequenceResetWorkItem?.cancel()
        escapeSequenceResetWorkItem = nil

        if let monitor = localKeyMonitor {
            NSEvent.removeMonitor(monitor)
            localKeyMonitor = nil
        }

        if let tap = eventTap {
            CGEvent.tapEnable(tap: tap, enable: false)
        }
        if let source = eventTapSource {
            CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes)
        }
        eventTap = nil
        eventTapSource = nil

        for window in windows {
            NSAnimationContext.runAnimationGroup { context in
                context.duration = 0.25
                window.animator().alphaValue = 0
            }
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            guard let self else { return }
            for window in self.windows {
                window.orderOut(nil)
                window.close()
            }
            self.windows.removeAll()

            if let activity = self.activity {
                ProcessInfo.processInfo.endActivity(activity)
                self.activity = nil
            }

            NSApp.terminate(nil)
        }
    }

    // MARK: Keyboard — passive

    private func installLocalKeyMonitor() {
        localKeyMonitor = NSEvent.addLocalMonitorForEvents(
            matching: [.keyDown, .keyUp, .flagsChanged]
        ) { [weak self] event in
            guard let self else { return event }

            switch event.type {
            case .keyDown:
                if event.keyCode == 53, !event.isARepeat {
                    handleEscapePress()
                }
            default:
                break
            }

            return nil // swallow every key while cleaning
        }
    }

    private func handleEscapePress() {
        guard !isExiting else { return }

        escapePressCount += 1
        showEscapeProgress()

        if escapePressCount >= escapePressTarget {
            escapeSequenceResetWorkItem?.cancel()
            escapeSequenceResetWorkItem = nil
            requestFinish()
            return
        }

        escapeSequenceResetWorkItem?.cancel()
        let item = DispatchWorkItem { [weak self] in
            self?.resetEscapePressCount()
        }
        escapeSequenceResetWorkItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + escapeSequenceTimeout, execute: item)
    }

    private func requestFinish() {
        // Defer: finish() tears down the event tap, and this can be called from
        // inside the tap callback itself.
        DispatchQueue.main.async { [weak self] in
            self?.finish()
        }
    }

    // MARK: Keyboard — strict

    private func installEventTap() -> Bool {
        guard isAccessibilityTrusted(prompt: false) else {
            fputs("ScreenCleaner: Accessibility permission is not granted; falling back to passive input handling.\n", stderr)
            return false
        }

        let mask: CGEventMask =
            (1 << CGEventType.keyDown.rawValue) |
            (1 << CGEventType.keyUp.rawValue) |
            (1 << CGEventType.flagsChanged.rawValue)

        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: mask,
            callback: screenCleanerEventTapCallback,
            userInfo: Unmanaged.passUnretained(self).toOpaque()
        ) else {
            fputs("ScreenCleaner: could not create the keyboard event tap; falling back to passive input handling.\n", stderr)
            return false
        }

        guard let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0) else {
            return false
        }

        CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)

        eventTap = tap
        eventTapSource = source
        return true
    }

    fileprivate func handleEventTapEvent(
        type: CGEventType,
        event: CGEvent
    ) -> Unmanaged<CGEvent>? {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            if let tap = eventTap {
                CGEvent.tapEnable(tap: tap, enable: true)
            }
            return Unmanaged.passUnretained(event)
        }

        let keyCode = event.getIntegerValueField(.keyboardEventKeycode)

        switch type {
        case .keyDown:
            if keyCode == 53, event.getIntegerValueField(.keyboardEventAutorepeat) == 0 {
                handleEscapePress()
            }
            return nil
        case .keyUp:
            return nil
        case .flagsChanged:
            return nil
        default:
            return Unmanaged.passUnretained(event)
        }
    }

    // MARK: Signals

    private func installSignalHandlers() {
        for signalNumber in [SIGTERM, SIGINT] {
            signal(signalNumber, SIG_IGN)
            let source = DispatchSource.makeSignalSource(signal: signalNumber, queue: .main)
            source.setEventHandler { [weak self] in
                self?.finish()
            }
            source.resume()
            signalSources.append(source)
        }
    }
}

// MARK: - Event tap callback

private let screenCleanerEventTapCallback: CGEventTapCallBack = { _, type, event, userInfo in
    guard let userInfo else { return Unmanaged.passUnretained(event) }
    let controller = Unmanaged<CleanerController>.fromOpaque(userInfo).takeUnretainedValue()
    return controller.handleEventTapEvent(type: type, event: event)
}

// MARK: - Entry point

private let options = parseOptions()

if options.requestAccessibilityOnly {
    let trusted = isAccessibilityTrusted(prompt: true)
    print(trusted ? "trusted" : "not-trusted")
    // Give the system prompt a moment to appear before this process exits.
    if !trusted {
        Thread.sleep(forTimeInterval: 1.5)
    }
    exit(trusted ? 0 : 1)
}

let application = NSApplication.shared
private let controller = CleanerController(options: options)
application.delegate = controller
application.setActivationPolicy(.accessory)
application.run()
