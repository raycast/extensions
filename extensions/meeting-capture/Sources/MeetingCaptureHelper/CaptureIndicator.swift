import AppKit

@MainActor
final class CaptureIndicator {
    private final class IndicatorPanel: NSPanel {
        override var canBecomeKey: Bool { false }
        override var canBecomeMain: Bool { false }
    }

    private let panel: NSPanel
    private let titleLabel: NSTextField
    private let detailLabel: NSTextField
    private let elapsedLabel: NSTextField
    private var accumulatedSeconds: TimeInterval = 0
    private var resumedAt: Date? = Date()
    private var timer: Timer?
    private var screenObserver: NSObjectProtocol?

    init() {
        let size = NSSize(width: 242, height: 44)
        panel = IndicatorPanel(
            contentRect: NSRect(origin: .zero, size: size),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.level = .statusBar
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.ignoresMouseEvents = true
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = [
            .canJoinAllSpaces,
            .fullScreenAuxiliary,
            .stationary,
            .ignoresCycle,
        ]
        panel.animationBehavior = .utilityWindow
        panel.setAccessibilityTitle("Meeting recording in progress")

        let background = NSVisualEffectView(frame: NSRect(origin: .zero, size: size))
        background.material = .hudWindow
        background.blendingMode = .behindWindow
        background.state = .active
        background.wantsLayer = true
        background.layer?.cornerRadius = 13
        background.layer?.masksToBounds = true

        let dot = NSView(frame: NSRect(x: 14, y: 16, width: 12, height: 12))
        dot.wantsLayer = true
        dot.layer?.backgroundColor = NSColor.systemRed.cgColor
        dot.layer?.cornerRadius = 6
        dot.setAccessibilityLabel("Recording")

        titleLabel = NSTextField(labelWithString: "Recording")
        titleLabel.frame = NSRect(x: 36, y: 22, width: 90, height: 16)
        titleLabel.font = .systemFont(ofSize: 13, weight: .semibold)
        titleLabel.textColor = .labelColor

        elapsedLabel = NSTextField(labelWithString: "00:00")
        elapsedLabel.frame = NSRect(x: 183, y: 13, width: 46, height: 20)
        elapsedLabel.font = .monospacedDigitSystemFont(ofSize: 13, weight: .medium)
        elapsedLabel.alignment = .right
        elapsedLabel.textColor = .secondaryLabelColor
        elapsedLabel.setAccessibilityLabel("Elapsed recording time")

        detailLabel = NSTextField(labelWithString: "System + mic")
        detailLabel.frame = NSRect(x: 36, y: 7, width: 150, height: 14)
        detailLabel.font = .systemFont(ofSize: 10, weight: .regular)
        detailLabel.textColor = .secondaryLabelColor

        background.addSubview(dot)
        background.addSubview(titleLabel)
        background.addSubview(detailLabel)
        background.addSubview(elapsedLabel)
        panel.contentView = background
    }

    func showTranscribing(mode: String) {
        timer?.invalidate()
        timer = nil
        titleLabel.stringValue = "Transcribing"
        detailLabel.stringValue = mode
        elapsedLabel.stringValue = "…"
        panel.setAccessibilityTitle("Meeting transcription in progress")
    }

    func showModelDownload(_ message: String) {
        titleLabel.stringValue = "Downloading model"
        detailLabel.stringValue = message
        elapsedLabel.stringValue = "↓"
        panel.setAccessibilityTitle(message)
    }

    func pause() {
        if let resumedAt { accumulatedSeconds += Date().timeIntervalSince(resumedAt) }
        self.resumedAt = nil
        updateElapsedTime()
        titleLabel.stringValue = "Paused"
        detailLabel.stringValue = "Capture stopped"
        panel.setAccessibilityTitle("Meeting capture paused")
    }

    func resume() {
        resumedAt = Date()
        titleLabel.stringValue = "Recording"
        detailLabel.stringValue = "System + mic"
        panel.setAccessibilityTitle("Meeting recording in progress")
    }

    func show() {
        updateElapsedTime()
        positionOnActiveScreen()
        panel.orderFrontRegardless()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.updateElapsedTime()
            }
        }
        screenObserver = NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.positionOnActiveScreen()
            }
        }
    }

    func hide() {
        timer?.invalidate()
        timer = nil
        if let screenObserver { NotificationCenter.default.removeObserver(screenObserver) }
        screenObserver = nil
        panel.orderOut(nil)
        panel.close()
    }

    private func updateElapsedTime() {
        let elapsed = Int(capturedElapsed(accumulated: accumulatedSeconds, runningSince: resumedAt))
        elapsedLabel.stringValue = String(format: "%02d:%02d", elapsed / 60, elapsed % 60)
    }

    private func positionOnActiveScreen() {
        let mouseLocation = NSEvent.mouseLocation
        let targetScreen = NSScreen.screens.first { NSMouseInRect(mouseLocation, $0.frame, false) } ?? NSScreen.main ?? NSScreen.screens.first
        guard let visibleFrame = targetScreen?.visibleFrame else { return }
        let frame = panel.frame
        panel.setFrameOrigin(NSPoint(
            x: visibleFrame.maxX - frame.width - 16,
            y: visibleFrame.maxY - frame.height - 16
        ))
    }
}
