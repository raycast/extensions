import AppKit

/// Coordinator subclass for the Measure (pixel inspection) overlay command.
///
/// Accessible from both RaycastBridge (via @raycast wrapper) and the standalone App target.
/// Manages EdgeDetector instances per screen and MeasureWindow creation.
open class MeasureCoordinator: OverlayCoordinator {
    public static let shared = MeasureCoordinator()

    private var correctionMode: CorrectionMode = .smart
    private var detectors: [ObjectIdentifier: EdgeDetector] = [:]

    public func run(hideHintBar: Bool, corrections: String) {
        correctionMode = CorrectionMode(rawValue: corrections) ?? .smart
        super.run(hideHintBar: hideHintBar)
    }

    override open func resetCommandState() {
        detectors.removeAll()
    }

    override open func captureAllScreens() -> [(screen: NSScreen, image: CGImage?)] {
        let captures = super.captureAllScreens()
        for (screen, image) in captures {
            let detector = EdgeDetector()
            detector.correctionMode = correctionMode
            if let image {
                detector.applyCapture(cgImage: image, screenFrame: CoordinateConverter.appKitRectToCG(screen.frame))
            }
            detectors[ObjectIdentifier(screen)] = detector
        }
        return captures
    }

    override open func createWindow(for screen: NSScreen, image: CGImage?, isCursorScreen: Bool, hideHintBar: Bool) -> NSWindow {
        let detector = detectors[ObjectIdentifier(screen)] ?? EdgeDetector()
        let measureWindow = MeasureWindow.create(
            for: screen,
            edgeDetector: detector,
            hideHintBar: isCursorScreen ? hideHintBar : true,
            screenshot: image
        )

        if let cgImage = image {
            measureWindow.setBackground(cgImage)
        }

        return measureWindow
    }

    override open func wireCallbacks(for window: NSWindow) {
        guard let measureWindow = window as? MeasureWindow else { return }
        measureWindow.onActivate = { [weak self] window in
            self?.activateWindow(window)
        }
        measureWindow.onRequestExit = { [weak self] in
            self?.handleExit()
        }
        measureWindow.onFirstMove = { [weak self] in
            self?.handleFirstMove()
        }
        measureWindow.onActivity = { [weak self] in
            self?.resetInactivityTimer()
        }
    }

    override open func activateWindow(_ window: NSWindow) {
        super.activateWindow(window)
        guard let measureWindow = window as? MeasureWindow else { return }
        measureWindow.activate(firstMoveAlreadyReceived: firstMoveReceived)
    }
}
