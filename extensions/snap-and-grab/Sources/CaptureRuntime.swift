import AppKit
import CoreGraphics
import Darwin
import Foundation

@_silgen_name("flock")
private func lockFile(_ descriptor: Int32, _ operation: Int32) -> Int32

private var base = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Capture and Copy")
private var invokedAt = ProcessInfo.processInfo.systemUptime
private let notificationName = Notification.Name("com.alon.snapAndGrab.captureRequested")
let notificationObject = NSUserName()
let dismissHUDNotification = Notification.Name("com.alon.snapAndGrab.dismissConfirmation")
private var captureShortcut = CaptureShortcut(initialFlags: CGEventSource.flagsState(.hidSystemState))
private var descriptor: Int32 = -1
private var previewEnabled = true
private var confirmationSeconds: Double = 1.4

func trace(_ message: String) {
    fputs("\(String(format: "%.3f", ProcessInfo.processInfo.systemUptime)) pid=\(getpid()) \(message)\n", stderr)
}

func modifiersHeld() -> Bool {
    captureShortcut.isHeld(in: CGEventSource.flagsState(.hidSystemState))
}

final class CaptureCoordinator {
    private var session = BatchSession()
    private let folder: URL
    private let hud = SelectionHUD()
    private var historyMessage: String?
    private var observer: NSObjectProtocol?
    private var confirmationObserver: NSObjectProtocol?
    private var transferComplete = false
    private var confirmationDismissed = false
    private var timer: Timer?
    private var capture: Process?
    private let started = Date()
    private var ending = false
    private let pasteboard = NSPasteboard.general

    init(folder: URL) { self.folder = folder; hud.previewsEnabled = previewEnabled }

    func start() {
        trace("session-start held=\(modifiersHeld())")
        observer = DistributedNotificationCenter.default().addObserver(
            forName: notificationName, object: notificationObject, queue: .main
        ) { [weak self] notification in
            guard let requestedAt = notification.userInfo?["requestedAt"] as? Double else { return }
            self?.selectPrevious(requestedAt: requestedAt)
        }
        timer = Timer.scheduledTimer(withTimeInterval: 0.01, repeats: true) { [weak self] _ in
            guard let self else { return }
            if !modifiersHeld() || Date().timeIntervalSince(self.started) > 600 {
                if !self.session.closing { trace("modifiers-released") }
                if self.session.modifiersReleased() { self.finish() }
            }
        }
        confirmationObserver = DistributedNotificationCenter.default().addObserver(
            forName: dismissHUDNotification, object: notificationObject, queue: .main
        ) { [weak self] _ in
            guard let self, self.ending else { return }
            self.confirmationDismissed = true
            self.hud.hide()
            // Never truncate clipboard finalization to dismiss a toast.
            if self.transferComplete { exit(0) }
        }
        beginCapture()
    }

    private func selectPrevious(requestedAt: TimeInterval) {
        guard !ending else { return }
        if !modifiersHeld() {
            if session.modifiersReleased() { finish() }
            return
        }
        let added = session.selectPrevious(requestedAt: requestedAt)
        trace("select-previous added=\(added) count=\(session.files.count)")
        guard !session.capturing && !session.files.isEmpty else { return }
        hud.update(files: session.files, available: session.availableCount, modifiersLabel: captureShortcut.label, message: historyMessage)
        hud.show()
    }

    private func beginCapture() {
        guard session.beginCapture() else { return }
        let previous = pasteboard.changeCount
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd 'at' HH.mm.ss"
        let file = folder.appendingPathComponent("Screenshot \(formatter.string(from: Date())) \(UUID().uuidString.prefix(8)).png")
        let process = Process()
        capture = process
        process.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
        process.arguments = ["-i", "-c", "-t", "png"]
        process.terminationHandler = { [weak self] terminated in
            DispatchQueue.main.async { self?.captureFinished(terminated, previous: previous, file: file) }
        }
        do { try process.run() }
        catch {
            trace("capture-start-error \(error)")
            showFailure(title: "Couldn't start screenshot capture", detail: "Try Capture and Copy again.")
        }
    }

    private func captureFinished(_ process: Process, previous: Int, file: URL) {
        guard !ending else { return }
        capture = nil
        var saved: URL?
        var history: [URL] = []
        if process.terminationStatus == 0 {
            do {
                if try saveNewCapture(from: pasteboard, previousChangeCount: previous, to: file) { saved = file }
            } catch {
                trace("capture-save-error \(error)")
                showFailure(title: "Screenshot wasn't saved", detail: "Check the screenshot folder or disk space.")
                return
            }
        }
        if saved != nil {
            do {
                let prefix = UserDefaults(suiteName: "com.apple.screencapture")?.string(forKey: "name") ?? "Screenshot"
                history = try recentScreenshotFiles(in: folder, excluding: file, screenshotPrefix: prefix)
            } catch {
                trace("history-read-error \(error)")
                historyMessage = "Can't read older screenshots · Release \(captureShortcut.label) to copy"
            }
        }
        trace("capture-finished saved=\(saved != nil) older=\(history.count) held=\(modifiersHeld())")
        if !modifiersHeld() { _ = session.modifiersReleased() }
        if session.captureCompleted(file: saved, history: history) { finish(); return }
        hud.update(files: session.files, available: session.availableCount, modifiersLabel: captureShortcut.label, message: historyMessage)
        hud.show()
    }

    private func showFailure(title: String, detail: String) {
        ending = true
        timer?.invalidate()
        if let observer { DistributedNotificationCenter.default().removeObserver(observer) }
        _ = lockFile(descriptor, LOCK_UN)
        // Error feedback remains visible even when success confirmations are off.
        transferComplete = true
        hud.updateFailure(title: title, detail: detail)
        hud.show()
        Timer.scheduledTimer(withTimeInterval: 4, repeats: false) { [self] _ in
            hud.hide()
            exit(1)
        }
    }

    private func finish() {
        guard !ending else { return }
        ending = true
        timer?.invalidate()
        hud.hide()
        if let observer { DistributedNotificationCenter.default().removeObserver(observer) }
        do {
            try publishCaptureBatch(session.files, to: pasteboard)
            trace("selection-copied count=\(session.files.count)")
            guard !session.files.isEmpty else { exit(0) }
            let publishedChange = pasteboard.changeCount
            // Free the hotkey immediately; the hidden clipboard owner remains
            // alive to finish transfer and show a brief passive confirmation.
            _ = lockFile(descriptor, LOCK_UN)
            completeClipboardTransfer { [self] in
                transferComplete = true
                trace("clipboard-finalized")
                guard !confirmationDismissed, pasteboard.changeCount == publishedChange else { exit(0) }
                guard confirmationSeconds > 0 else { exit(0) }
                hud.updateCopied(files: session.files)
                hud.show()
                Timer.scheduledTimer(withTimeInterval: confirmationSeconds, repeats: false) { [self] _ in
                    hud.hide()
                    exit(0)
                }
            }
        } catch {
            trace("clipboard-error \(error)")
            showFailure(title: "Couldn't copy screenshots", detail: "Saved files remain in your screenshot folder.")
        }
    }
}

func runCaptureSession(folderPath: String, supportPath: String, previews: Bool, confirmationDuration: Double, initialFlags: UInt64? = nil, requestedAt: Double? = nil) throws {
    base = URL(fileURLWithPath: supportPath, isDirectory: true)
    invokedAt = requestedAt ?? ProcessInfo.processInfo.systemUptime
    captureShortcut = CaptureShortcut(initialFlags: initialFlags.map { CGEventFlags(rawValue: $0) } ?? CGEventSource.flagsState(.hidSystemState))
    previewEnabled = previews
    confirmationSeconds = max(0, min(10, confirmationDuration))
    try FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
    descriptor = Darwin.open(base.appendingPathComponent("batch.lock").path, O_CREAT | O_RDWR, 0o600)
    guard descriptor >= 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
    _ = fcntl(descriptor, F_SETFD, FD_CLOEXEC)
    if lockFile(descriptor, LOCK_EX | LOCK_NB) != 0 {
        guard errno == EWOULDBLOCK else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
        DistributedNotificationCenter.default().postNotificationName(
            notificationName, object: notificationObject, userInfo: ["requestedAt": invokedAt], deliverImmediately: true)
        return
    }
    let folder = URL(fileURLWithPath: folderPath, isDirectory: true)
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    DistributedNotificationCenter.default().postNotificationName(
        dismissHUDNotification, object: notificationObject, userInfo: nil, deliverImmediately: true)
    let app = NSApplication.shared
    app.setActivationPolicy(.accessory)
    let coordinator = CaptureCoordinator(folder: folder)
    coordinator.start()
    app.run()
}
