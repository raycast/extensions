import AppKit
import Darwin
import Foundation

enum LensMode: String {
    case view
    case capture
    case crop
}

struct Arguments {
    let mode: LensMode
    let url: URL
    let title: String
    let output: URL?

    static func parse() throws -> Arguments {
        var mode: LensMode?
        var url: URL?
        var title = "BOOX Screen"
        var output: URL?
        var index = 1
        while index < CommandLine.arguments.count {
            let argument = CommandLine.arguments[index]
            guard index + 1 < CommandLine.arguments.count else { throw LensError.invalidArguments }
            let value = CommandLine.arguments[index + 1]
            switch argument {
            case "--mode": mode = LensMode(rawValue: value)
            case "--url": url = URL(string: value)
            case "--title": title = value
            case "--output": output = URL(fileURLWithPath: value)
            default: throw LensError.invalidArguments
            }
            index += 2
        }
        guard let mode, let url else { throw LensError.invalidArguments }
        return Arguments(mode: mode, url: url, title: title, output: output)
    }
}

enum LensError: LocalizedError {
    case invalidArguments
    case invalidFrame
    case streamEnded
    case clipboard

    var errorDescription: String? {
        switch self {
        case .invalidArguments: return "Usage: boox-lens --mode view|capture|crop --url URL [--title TITLE] [--output PNG]"
        case .invalidFrame: return "BOOX returned an invalid JPEG frame"
        case .streamEnded: return "The BOOX screen stream ended before a frame arrived"
        case .clipboard: return "Could not write the image to the clipboard"
        }
    }
}

final class MJPEGStream: NSObject, URLSessionDataDelegate, URLSessionTaskDelegate, @unchecked Sendable {
    private var buffer = Data()
    private var session: URLSession?
    private var task: URLSessionDataTask?
    private let authorization: String?
    private let delegateQueue: OperationQueue
    var onFrame: ((Data) -> Void)?
    var onError: ((Error) -> Void)?

    init(authorization: String?, delegateQueue: OperationQueue = .main) {
        self.authorization = authorization
        self.delegateQueue = delegateQueue
        super.init()
    }

    func start(url: URL) {
        stop()
        buffer.removeAll(keepingCapacity: true)
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 15
        configuration.timeoutIntervalForResource = 24 * 60 * 60
        if let authorization { configuration.httpAdditionalHeaders = ["Authorization": authorization] }
        delegateQueue.maxConcurrentOperationCount = 1
        let session = URLSession(configuration: configuration, delegate: self, delegateQueue: delegateQueue)
        self.session = session
        let task = session.dataTask(with: url)
        self.task = task
        task.resume()
    }

    func stop() {
        task?.cancel()
        task = nil
        session?.invalidateAndCancel()
        session = nil
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        buffer.append(data)
        extractFrames()
        if buffer.count > 32 * 1024 * 1024 {
            buffer = Data(buffer.suffix(4 * 1024 * 1024))
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error as? URLError, error.code == .cancelled { return }
        onError?(error ?? LensError.streamEnded)
    }

    private func extractFrames() {
        let startMarker = Data([0xff, 0xd8])
        let endMarker = Data([0xff, 0xd9])
        while let start = buffer.range(of: startMarker) {
            guard let end = buffer.range(of: endMarker, in: start.lowerBound..<buffer.endIndex) else {
                if start.lowerBound > buffer.startIndex { buffer.removeSubrange(buffer.startIndex..<start.lowerBound) }
                return
            }
            let frameEnd = end.upperBound
            let frame = Data(buffer[start.lowerBound..<frameEnd])
            buffer.removeSubrange(buffer.startIndex..<frameEnd)
            onFrame?(frame)
        }
    }
}

enum CanvasMode {
    case viewer
    case regionCapture
}

final class ImageCanvasView: NSView {
    let mode: CanvasMode
    var image: NSImage? {
        didSet {
            if oldValue?.size != image?.size { constrainPan() }
            needsDisplay = true
            window?.invalidateCursorRects(for: self)
        }
    }
    var onCopy: ((NSImage) -> Void)?
    var onCancel: (() -> Void)?
    var onRotate: ((Bool) -> Void)?
    var onFitModeChange: ((Bool) -> Void)?
    var onZoomChange: ((Int) -> Void)?

    private var selection: NSRect? { didSet { needsDisplay = true } }
    private var dragOrigin: NSPoint?
    private var panOrigin: NSPoint?
    private var panAtDragStart = NSPoint.zero
    private var manualScale: CGFloat?
    private var panOffset = NSPoint.zero
    private(set) var imageRect: NSRect = .zero

    init(frame frameRect: NSRect, mode: CanvasMode) {
        self.mode = mode
        super.init(frame: frameRect)
    }

    required init?(coder: NSCoder) { nil }

    override var acceptsFirstResponder: Bool { true }
    override var isFlipped: Bool { false }
    var isFitMode: Bool { manualScale == nil }
    var zoomPercent: Int { Int((currentScale() / actualSizeScale() * 100).rounded()) }

    override func draw(_ dirtyRect: NSRect) {
        NSColor.black.setFill()
        bounds.fill()
        guard let image else { return }
        imageRect = displayedImageRect(for: image)
        image.draw(in: imageRect, from: .zero, operation: .copy, fraction: 1)

        if mode == .regionCapture, let selection {
            NSColor.black.withAlphaComponent(0.48).setFill()
            let shade = NSBezierPath(rect: imageRect)
            shade.appendRect(selection.intersection(imageRect))
            shade.windingRule = .evenOdd
            shade.fill()
            NSColor.white.setStroke()
            let outline = NSBezierPath(rect: selection.intersection(imageRect))
            outline.lineWidth = 2
            outline.stroke()
            if let size = selectedPixelSize(image: image, selection: selection) {
                let labelPoint = NSPoint(x: selection.minX, y: min(selection.maxY + 7, bounds.maxY - 22))
                drawText("\(size.width) × \(size.height)", at: labelPoint, color: .white)
            }
        }

        if mode == .regionCapture {
            drawText("Drag to copy  •  R rotate  •  Esc cancel", at: NSPoint(x: 16, y: 14), color: .white.withAlphaComponent(0.82))
        }
    }

    override func resetCursorRects() {
        super.resetCursorRects()
        addCursorRect(bounds, cursor: .arrow)
        guard let image else { return }
        let cursorImageRect = displayedImageRect(for: image)
        addCursorRect(cursorImageRect, cursor: mode == .regionCapture ? .crosshair : manualScale == nil ? .arrow : .openHand)
    }

    override func mouseDragged(with event: NSEvent) {
        let point = convert(event.locationInWindow, from: nil)
        switch mode {
        case .regionCapture:
            guard let origin = dragOrigin else { return }
            selection = normalizedRect(from: origin, to: clamp(point, to: imageRect)).intersection(imageRect)
        case .viewer:
            guard let origin = panOrigin else { return }
            panOffset = NSPoint(x: panAtDragStart.x + point.x - origin.x, y: panAtDragStart.y + point.y - origin.y)
            constrainPan()
            needsDisplay = true
        }
    }

    override func magnify(with event: NSEvent) {
        guard mode == .viewer, image != nil else { return }
        setScale(currentScale() * (1 + event.magnification), around: convert(event.locationInWindow, from: nil))
    }

    override func scrollWheel(with event: NSEvent) {
        guard mode == .viewer, image != nil else { return }
        if event.modifierFlags.contains(.command) {
            let delta = event.hasPreciseScrollingDeltas ? event.scrollingDeltaY : event.deltaY * 8
            setScale(currentScale() * exp(delta * 0.008), around: convert(event.locationInWindow, from: nil))
            return
        }
        guard manualScale != nil else { return }
        panOffset.x += event.scrollingDeltaX
        panOffset.y += event.scrollingDeltaY
        constrainPan()
        needsDisplay = true
    }

    override var mouseDownCanMoveWindow: Bool { false }

    override func mouseUp(with event: NSEvent) {
        switch mode {
        case .regionCapture:
            defer { dragOrigin = nil }
            guard let selection, selection.width >= 2, selection.height >= 2 else {
                self.selection = nil
                return
            }
            guard let output = cropCurrentSelection() else { return }
            onCopy?(output)
        case .viewer:
            panOrigin = nil
            window?.invalidateCursorRects(for: self)
        }
    }

    override func mouseDown(with event: NSEvent) {
        guard image != nil else { return }
        if mode == .viewer, event.clickCount == 2 {
            toggleFitAndActualSize()
            return
        }
        let point = convert(event.locationInWindow, from: nil)
        switch mode {
        case .regionCapture:
            let start = clamp(point, to: imageRect)
            dragOrigin = start
            selection = NSRect(origin: start, size: .zero)
        case .viewer:
            guard manualScale != nil else { return }
            panOrigin = point
            panAtDragStart = panOffset
            NSCursor.closedHand.set()
        }
    }

    override func keyDown(with event: NSEvent) {
        let key = event.charactersIgnoringModifiers?.lowercased() ?? ""
        if event.keyCode == 53 {
            onCancel?()
            return
        }
        if key == "r" {
            onRotate?(event.modifierFlags.contains(.shift))
            return
        }
        if mode == .viewer, key == "c", event.modifierFlags.contains(.command), let image {
            onCopy?(image)
            return
        }
        super.keyDown(with: event)
    }

    func toggleFitAndActualSize() {
        guard image != nil else { return }
        if manualScale == nil {
            manualScale = actualSizeScale()
        } else {
            manualScale = nil
            panOffset = .zero
        }
        constrainPan()
        needsDisplay = true
        window?.invalidateCursorRects(for: self)
        onFitModeChange?(manualScale == nil)
        emitZoomChange()
    }

    func resetZoom() {
        manualScale = nil
        panOffset = .zero
        needsDisplay = true
        window?.invalidateCursorRects(for: self)
        onFitModeChange?(true)
        emitZoomChange()
    }

    private func cropCurrentSelection() -> NSImage? {
        guard let image else { return nil }
        guard let selection, selection.width >= 2, selection.height >= 2 else { return nil }
        return crop(image: image, selection: selection, displayedIn: imageRect)
    }

    private func selectedPixelSize(image: NSImage, selection: NSRect) -> (width: Int, height: Int)? {
        guard let rect = cropPixelRect(image: image, selection: selection, displayedIn: imageRect) else { return nil }
        return (Int(rect.width), Int(rect.height))
    }

    private func displayedImageRect(for image: NSImage) -> NSRect {
        let viewport = bounds.insetBy(dx: 20, dy: mode == .viewer ? 20 : 42)
        guard let manualScale else { return aspectFitRect(imageSize: image.size, bounds: viewport) }
        let size = NSSize(width: image.size.width * manualScale, height: image.size.height * manualScale)
        return NSRect(x: viewport.midX - size.width / 2 + panOffset.x, y: viewport.midY - size.height / 2 + panOffset.y, width: size.width, height: size.height)
    }

    private func currentScale() -> CGFloat {
        guard let image else { return 1 }
        if let manualScale { return manualScale }
        let viewport = bounds.insetBy(dx: 20, dy: 20)
        return min(viewport.width / image.size.width, viewport.height / image.size.height)
    }

    private func setScale(_ proposedScale: CGFloat, around point: NSPoint) {
        guard let image else { return }
        let oldRect = displayedImageRect(for: image)
        let oldScale = currentScale()
        let actualScale = actualSizeScale()
        let scale = min(max(proposedScale, actualScale * 0.1), actualScale * 8)
        let relativeX = oldRect.width > 0 ? (point.x - oldRect.midX) / oldScale : 0
        let relativeY = oldRect.height > 0 ? (point.y - oldRect.midY) / oldScale : 0
        manualScale = scale
        panOffset.x += relativeX * (oldScale - scale)
        panOffset.y += relativeY * (oldScale - scale)
        constrainPan()
        needsDisplay = true
        window?.invalidateCursorRects(for: self)
        onFitModeChange?(false)
        emitZoomChange()
    }

    private func actualSizeScale() -> CGFloat {
        1 / max(window?.backingScaleFactor ?? 1, 1)
    }

    private func emitZoomChange() {
        onZoomChange?(zoomPercent)
    }

    private func constrainPan() {
        guard mode == .viewer, let image, let scale = manualScale else {
            if manualScale == nil { panOffset = .zero }
            return
        }
        let viewport = bounds.insetBy(dx: 20, dy: 20)
        let maxX = max(0, (image.size.width * scale - viewport.width) / 2)
        let maxY = max(0, (image.size.height * scale - viewport.height) / 2)
        panOffset.x = min(max(panOffset.x, -maxX), maxX)
        panOffset.y = min(max(panOffset.y, -maxY), maxY)
    }

    override func setFrameSize(_ newSize: NSSize) {
        super.setFrameSize(newSize)
        constrainPan()
    }

    private func drawText(_ text: String, at point: NSPoint, color: NSColor) {
        text.draw(at: point, withAttributes: [
            .font: NSFont.systemFont(ofSize: 12, weight: .medium),
            .foregroundColor: color,
        ])
    }
}

final class LensHUD {
    private var panel: NSPanel?
    private var hideWorkItem: DispatchWorkItem?

    func show(_ message: String, on screen: NSScreen?) {
        dismiss()

        let label = NSTextField(labelWithString: message)
        label.font = .systemFont(ofSize: 15, weight: .medium)
        label.textColor = .white
        label.lineBreakMode = .byTruncatingTail

        let icon = NSImageView(image: NSImage(systemSymbolName: "checkmark.circle.fill", accessibilityDescription: "Copied") ?? NSImage())
        icon.contentTintColor = .white
        icon.symbolConfiguration = .init(pointSize: 16, weight: .semibold)

        let stack = NSStackView(views: [icon, label])
        stack.orientation = .horizontal
        stack.alignment = .centerY
        stack.spacing = 9
        stack.translatesAutoresizingMaskIntoConstraints = false

        let labelWidth = min(label.intrinsicContentSize.width, 420)
        let size = NSSize(width: labelWidth + 58, height: 44)
        let panel = NSPanel(
            contentRect: NSRect(origin: .zero, size: size),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.hidesOnDeactivate = false
        panel.ignoresMouseEvents = true
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle]

        let background = NSVisualEffectView(frame: NSRect(origin: .zero, size: size))
        background.material = .hudWindow
        background.blendingMode = .behindWindow
        background.state = .active
        background.wantsLayer = true
        background.layer?.cornerRadius = 12
        background.layer?.masksToBounds = true
        background.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: background.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: background.trailingAnchor, constant: -16),
            stack.centerYAnchor.constraint(equalTo: background.centerYAnchor),
            icon.widthAnchor.constraint(equalToConstant: 18),
            icon.heightAnchor.constraint(equalToConstant: 18),
        ])
        panel.contentView = background

        let targetScreen = screen ?? NSScreen.main
        let visibleFrame = targetScreen?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1200, height: 800)
        panel.setFrameOrigin(NSPoint(x: visibleFrame.midX - size.width / 2, y: visibleFrame.minY + 72))
        panel.alphaValue = 0
        panel.orderFrontRegardless()
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.12
            panel.animator().alphaValue = 1
        }
        self.panel = panel

        let workItem = DispatchWorkItem { [weak self, weak panel] in
            guard let self, let panel, self.panel === panel else { return }
            NSAnimationContext.runAnimationGroup({ context in
                context.duration = 0.2
                panel.animator().alphaValue = 0
            }, completionHandler: {
                panel.orderOut(nil)
                if self.panel === panel { self.panel = nil }
            })
        }
        hideWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.15, execute: workItem)
    }

    func dismiss() {
        hideWorkItem?.cancel()
        hideWorkItem = nil
        panel?.orderOut(nil)
        panel = nil
    }
}

final class LensController: NSObject, NSApplicationDelegate, NSWindowDelegate {
    private let arguments: Arguments
    private let stream: MJPEGStream
    private var window: NSWindow?
    private var canvas: ImageCanvasView?
    private var sourceImage: NSImage?
    private var rotationSteps = 0
    private var resultEmitted = false
    private var reconnectAttempt = 0
    private var reconnectWorkItem: DispatchWorkItem?
    private var connectionIndicatorWorkItem: DispatchWorkItem?
    private var centerIndicator: NSProgressIndicator?
    private var titleIndicator: NSProgressIndicator?
    private var fitButton: NSButton?
    private var pinButton: NSButton?
    private let copyHUD = LensHUD()
    private var isClosing = false
    private var launchScreen: NSScreen?
    private var readyEmitted = false

    init(arguments: Arguments) {
        self.arguments = arguments
        self.stream = MJPEGStream(authorization: ProcessInfo.processInfo.environment["BOOX_AUTHORIZATION"])
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        launchScreen = NSScreen.main
        stream.onFrame = { [weak self] data in self?.receivedFrame(data) }
        stream.onError = { [weak self] error in self?.streamFailed(error) }
        if arguments.mode == .view { showWindow(image: nil, mode: .viewer) }
        stream.start(url: arguments.url)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func windowWillClose(_ notification: Notification) {
        isClosing = true
        reconnectWorkItem?.cancel()
        connectionIndicatorWorkItem?.cancel()
        copyHUD.dismiss()
        stream.stop()
        if arguments.mode == .crop && !resultEmitted {
            resultEmitted = true
            emitJSON(["status": "cancelled"])
        }
        NSApp.terminate(nil)
    }

    private func receivedFrame(_ data: Data) {
        guard let image = NSImage(data: data) else {
            if arguments.mode != .view { fail(LensError.invalidFrame) }
            return
        }
        switch arguments.mode {
        case .capture:
            stream.stop()
            finishCopy(image)
        case .crop:
            stream.stop()
            sourceImage = image
            showWindow(image: displayedImage(from: image), mode: .regionCapture)
        case .view:
            reconnectAttempt = 0
            reconnectWorkItem?.cancel()
            connectionIndicatorWorkItem?.cancel()
            setConnectionIndicators(visible: false)
            sourceImage = image
            canvas?.image = displayedImage(from: image)
            if !readyEmitted {
                readyEmitted = true
                let size = pixelSize(image)
                emitJSON(["status": "opened", "width": size.width, "height": size.height])
            }
        }
    }

    private func showWindow(image: NSImage?, mode: CanvasMode) {
        if let window {
            canvas?.image = image
            window.makeKeyAndOrderFront(nil)
            return
        }
        let targetScreen = launchScreen ?? NSScreen.main
        let visible = targetScreen?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1200, height: 800)
        let size = NSSize(width: min(760, visible.width * 0.72), height: min(920, visible.height * 0.84))
        let frame = NSRect(
            x: visible.midX - size.width / 2,
            y: visible.midY - size.height / 2,
            width: size.width,
            height: size.height
        )
        let window = NSWindow(
            contentRect: frame,
            styleMask: [.titled, .closable, .resizable, .miniaturizable],
            backing: .buffered,
            defer: false,
            screen: targetScreen
        )
        window.title = arguments.title
        window.isReleasedWhenClosed = false
        window.delegate = self
        window.collectionBehavior = [.fullScreenPrimary]
        if mode == .viewer {
            window.setFrameAutosaveName("BOOXLensViewer")
            let rememberedSize = window.frame.size
            let launchSize = NSSize(
                width: min(rememberedSize.width, visible.width),
                height: min(rememberedSize.height, visible.height)
            )
            let centeredFrame = NSRect(
                x: visible.midX - launchSize.width / 2,
                y: visible.midY - launchSize.height / 2,
                width: launchSize.width,
                height: launchSize.height
            )
            window.setFrame(window.constrainFrameRect(centeredFrame, to: targetScreen), display: false)
        }
        let canvas = ImageCanvasView(frame: window.contentView?.bounds ?? .zero, mode: mode)
        canvas.autoresizingMask = [.width, .height]
        canvas.image = image
        canvas.onCancel = { [weak self] in
            self?.window?.close()
        }
        canvas.onCopy = { [weak self] output in
            if mode == .regionCapture { self?.finishCopy(output) }
            else if copyImage(output) { self?.showCopyHUD(for: output) }
            else { NSSound.beep() }
        }
        canvas.onRotate = { [weak self] counterClockwise in
            self?.rotateCurrentImage(counterClockwise: counterClockwise)
        }
        window.contentView = canvas
        self.window = window
        self.canvas = canvas
        if mode == .viewer {
            installViewerControls(on: window)
            installCenterIndicator(on: canvas)
            restoreViewerPreferences()
        }
        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
        window.makeFirstResponder(canvas)
    }

    private func installCenterIndicator(on canvas: NSView) {
        let indicator = NSProgressIndicator()
        indicator.style = .spinning
        indicator.controlSize = .regular
        indicator.translatesAutoresizingMaskIntoConstraints = false
        indicator.startAnimation(nil)
        canvas.addSubview(indicator)
        NSLayoutConstraint.activate([
            indicator.centerXAnchor.constraint(equalTo: canvas.centerXAnchor),
            indicator.centerYAnchor.constraint(equalTo: canvas.centerYAnchor),
        ])
        centerIndicator = indicator
    }

    private func installViewerControls(on window: NSWindow) {
        let rotateButton = symbolButton("rotate.right", toolTip: "Rotate", action: #selector(rotateClockwise))
        let fitButton = NSButton(title: "Fit", target: self, action: #selector(toggleFitAndActualSize))
        fitButton.isBordered = false
        fitButton.font = .systemFont(ofSize: 11, weight: .semibold)
        fitButton.toolTip = "Show at Actual Size"
        let pinButton = symbolButton("pin", toolTip: "Keep on Top", action: #selector(toggleAlwaysOnTop))
        let indicator = NSProgressIndicator()
        indicator.style = .spinning
        indicator.controlSize = .small
        indicator.isHidden = true
        let stack = NSStackView(views: [indicator, rotateButton, fitButton, pinButton])
        stack.orientation = .horizontal
        stack.spacing = 4
        stack.translatesAutoresizingMaskIntoConstraints = false
        let container = NSView(frame: NSRect(x: 0, y: 0, width: 136, height: 28))
        container.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 4),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -6),
            stack.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            indicator.widthAnchor.constraint(equalToConstant: 14),
            indicator.heightAnchor.constraint(equalToConstant: 14),
            rotateButton.widthAnchor.constraint(equalToConstant: 24),
            rotateButton.heightAnchor.constraint(equalToConstant: 24),
            fitButton.widthAnchor.constraint(equalToConstant: 44),
            fitButton.heightAnchor.constraint(equalToConstant: 24),
            pinButton.widthAnchor.constraint(equalToConstant: 24),
            pinButton.heightAnchor.constraint(equalToConstant: 24),
        ])
        let accessory = NSTitlebarAccessoryViewController()
        accessory.layoutAttribute = .right
        accessory.view = container
        window.addTitlebarAccessoryViewController(accessory)
        self.titleIndicator = indicator
        self.fitButton = fitButton
        self.pinButton = pinButton
    }

    private func symbolButton(_ symbol: String, toolTip: String, action: Selector) -> NSButton {
        let button = NSButton(image: NSImage(systemSymbolName: symbol, accessibilityDescription: toolTip) ?? NSImage(), target: self, action: action)
        button.isBordered = false
        button.imageScaling = .scaleProportionallyDown
        button.toolTip = toolTip
        return button
    }

    @objc private func rotateClockwise() { rotateCurrentImage(counterClockwise: false) }

    private func rotateCurrentImage(counterClockwise: Bool) {
        rotationSteps = (rotationSteps + (counterClockwise ? 3 : 1)) % 4
        if arguments.mode == .view { UserDefaults.standard.set(rotationSteps, forKey: "BOOXLensRotation") }
        guard let sourceImage else { return }
        canvas?.image = displayedImage(from: sourceImage)
        canvas?.resetZoom()
    }

    @objc private func toggleFitAndActualSize() {
        canvas?.toggleFitAndActualSize()
        updateFitButton()
    }

    private func updateFitButton() {
        let isFit = canvas?.isFitMode ?? true
        fitButton?.image = nil
        fitButton?.title = isFit ? "Fit" : "\(canvas?.zoomPercent ?? 100)%"
        fitButton?.toolTip = isFit ? "Show at Actual Size" : "Fit to Window"
    }

    private func showCopyHUD(for image: NSImage) {
        let size = pixelSize(image)
        copyHUD.show("Copied BOOX Screen · \(size.width) × \(size.height)", on: window?.screen)
    }

    @objc private func toggleAlwaysOnTop() {
        guard let window else { return }
        let pinned = window.level != .floating
        window.level = pinned ? .floating : .normal
        UserDefaults.standard.set(pinned, forKey: "BOOXLensAlwaysOnTop")
        pinButton?.image = NSImage(systemSymbolName: pinned ? "pin.fill" : "pin", accessibilityDescription: "Keep on Top")
    }

    private func restoreViewerPreferences() {
        rotationSteps = UserDefaults.standard.integer(forKey: "BOOXLensRotation") % 4
        let pinned = UserDefaults.standard.bool(forKey: "BOOXLensAlwaysOnTop")
        window?.level = pinned ? .floating : .normal
        pinButton?.image = NSImage(systemSymbolName: pinned ? "pin.fill" : "pin", accessibilityDescription: "Keep on Top")
        canvas?.onFitModeChange = { [weak self] _ in self?.updateFitButton() }
        canvas?.onZoomChange = { [weak self] _ in self?.updateFitButton() }
        updateFitButton()
        if let sourceImage { canvas?.image = displayedImage(from: sourceImage) }
    }

    private func displayedImage(from source: NSImage) -> NSImage {
        var output = source
        for _ in 0..<rotationSteps { output = rotate(image: output, counterClockwise: false) }
        return output
    }

    private func streamFailed(_ error: Error) {
        guard arguments.mode == .view, !isClosing else {
            if arguments.mode != .view { fail(error) }
            return
        }
        reconnectWorkItem?.cancel()
        connectionIndicatorWorkItem?.cancel()
        let indicatorWorkItem = DispatchWorkItem { [weak self] in self?.setConnectionIndicators(visible: true) }
        connectionIndicatorWorkItem = indicatorWorkItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 1, execute: indicatorWorkItem)
        let delay = min(pow(2, Double(reconnectAttempt)) * 0.5, 5)
        reconnectAttempt += 1
        let workItem = DispatchWorkItem { [weak self] in
            guard let self, !self.isClosing else { return }
            self.stream.start(url: self.arguments.url)
        }
        reconnectWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
    }

    private func setConnectionIndicators(visible: Bool) {
        centerIndicator?.isHidden = !visible || sourceImage != nil
        titleIndicator?.isHidden = !visible || sourceImage == nil
        if visible {
            centerIndicator?.startAnimation(nil)
            titleIndicator?.startAnimation(nil)
        } else {
            centerIndicator?.stopAnimation(nil)
            titleIndicator?.stopAnimation(nil)
        }
    }

    private func finishCopy(_ image: NSImage) {
        resultEmitted = true
        if let output = arguments.output {
            guard let data = pngData(image) else { fail(LensError.invalidFrame); return }
            do {
                try data.write(to: output, options: .atomic)
                let size = pixelSize(image)
                emitJSON(["status": "saved", "path": output.path, "width": size.width, "height": size.height])
                window?.orderOut(nil)
                NSApp.terminate(nil)
                return
            } catch {
                fail(error)
                return
            }
        }
        guard copyImage(image) else { fail(LensError.clipboard); return }
        let size = pixelSize(image)
        emitJSON(["status": "copied", "width": size.width, "height": size.height])
        window?.orderOut(nil)
        NSApp.terminate(nil)
    }

    private func fail(_ error: Error) {
        stream.stop()
        let message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        FileHandle.standardError.write(Data((message + "\n").utf8))
        window?.orderOut(nil)
        exit(1)
    }
}

func aspectFitRect(imageSize: NSSize, bounds: NSRect) -> NSRect {
    guard imageSize.width > 0, imageSize.height > 0 else { return .zero }
    let scale = min(bounds.width / imageSize.width, bounds.height / imageSize.height)
    let size = NSSize(width: imageSize.width * scale, height: imageSize.height * scale)
    return NSRect(x: bounds.midX - size.width / 2, y: bounds.midY - size.height / 2, width: size.width, height: size.height)
}

func normalizedRect(from start: NSPoint, to end: NSPoint) -> NSRect {
    NSRect(x: min(start.x, end.x), y: min(start.y, end.y), width: abs(end.x - start.x), height: abs(end.y - start.y))
}

func clamp(_ point: NSPoint, to rect: NSRect) -> NSPoint {
    NSPoint(x: min(max(point.x, rect.minX), rect.maxX), y: min(max(point.y, rect.minY), rect.maxY))
}

func crop(image: NSImage, selection: NSRect, displayedIn imageRect: NSRect) -> NSImage? {
    guard let cgImage = sourceCGImage(image),
          let cropRect = cropPixelRect(image: image, selection: selection, displayedIn: imageRect),
          let cropped = cgImage.cropping(to: cropRect) else { return nil }
    return NSImage(cgImage: cropped, size: NSSize(width: cropped.width, height: cropped.height))
}

func cropPixelRect(image: NSImage, selection: NSRect, displayedIn imageRect: NSRect) -> CGRect? {
    guard imageRect.width > 0, imageRect.height > 0,
          let cgImage = sourceCGImage(image) else { return nil }
    let scaleX = CGFloat(cgImage.width) / imageRect.width
    let scaleY = CGFloat(cgImage.height) / imageRect.height
    let clipped = selection.intersection(imageRect)
    let cropRect = CGRect(
        x: (clipped.minX - imageRect.minX) * scaleX,
        y: (imageRect.maxY - clipped.maxY) * scaleY,
        width: clipped.width * scaleX,
        height: clipped.height * scaleY
    ).integral.intersection(CGRect(x: 0, y: 0, width: cgImage.width, height: cgImage.height))
    return cropRect.width > 0 && cropRect.height > 0 ? cropRect : nil
}

func rotate(image: NSImage, counterClockwise: Bool) -> NSImage {
    guard let source = sourceCGImage(image) else { return image }
    let outputWidth = source.height
    let outputHeight = source.width
    guard let context = CGContext(
        data: nil,
        width: outputWidth,
        height: outputHeight,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return image }
    if counterClockwise {
        context.translateBy(x: 0, y: CGFloat(outputHeight))
        context.rotate(by: -.pi / 2)
    } else {
        context.translateBy(x: CGFloat(outputWidth), y: 0)
        context.rotate(by: .pi / 2)
    }
    context.draw(source, in: CGRect(x: 0, y: 0, width: source.width, height: source.height))
    guard let rotated = context.makeImage() else { return image }
    return NSImage(cgImage: rotated, size: NSSize(width: outputWidth, height: outputHeight))
}

func pngData(_ image: NSImage) -> Data? {
    guard let cgImage = sourceCGImage(image) else { return nil }
    let representation = NSBitmapImageRep(cgImage: cgImage)
    return representation.representation(using: .png, properties: [:])
}

func copyImage(_ image: NSImage) -> Bool {
    guard let data = pngData(image) else { return false }
    let pasteboard = NSPasteboard.general
    pasteboard.clearContents()
    return pasteboard.setData(data, forType: .png)
}

func pixelSize(_ image: NSImage) -> (width: Int, height: Int) {
    guard let cgImage = sourceCGImage(image) else { return (Int(image.size.width), Int(image.size.height)) }
    return (cgImage.width, cgImage.height)
}

func sourceCGImage(_ image: NSImage) -> CGImage? {
    var proposedRect = NSRect(origin: .zero, size: image.size)
    return image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil)
}

func emitJSON(_ object: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: object), var text = String(data: data, encoding: .utf8) else { return }
    text.append("\n")
    FileHandle.standardOutput.write(Data(text.utf8))
}

func runHeadlessCapture(arguments: Arguments) throws {
    let queue = OperationQueue()
    queue.maxConcurrentOperationCount = 1
    let stream = MJPEGStream(
        authorization: ProcessInfo.processInfo.environment["BOOX_AUTHORIZATION"],
        delegateQueue: queue
    )
    let semaphore = DispatchSemaphore(value: 0)
    let lock = NSLock()
    var capturedFrame: Data?
    var streamError: Error?
    var completed = false
    stream.onFrame = { data in
        lock.lock()
        guard !completed else { lock.unlock(); return }
        completed = true
        capturedFrame = data
        lock.unlock()
        semaphore.signal()
    }
    stream.onError = { error in
        lock.lock()
        guard !completed else { lock.unlock(); return }
        completed = true
        streamError = error
        lock.unlock()
        semaphore.signal()
    }
    stream.start(url: arguments.url)
    let waitResult = semaphore.wait(timeout: .now() + 15)
    stream.stop()
    if waitResult == .timedOut { throw URLError(.timedOut) }
    lock.lock()
    let resultFrame = capturedFrame
    let resultError = streamError
    lock.unlock()
    if let resultError { throw resultError }
    guard let resultFrame, let image = NSImage(data: resultFrame) else { throw LensError.invalidFrame }
    let size = pixelSize(image)
    if let output = arguments.output {
        guard let data = pngData(image) else { throw LensError.invalidFrame }
        try data.write(to: output, options: .atomic)
        emitJSON(["status": "saved", "path": output.path, "width": size.width, "height": size.height])
    } else {
        guard copyImage(image) else { throw LensError.clipboard }
        emitJSON(["status": "copied", "width": size.width, "height": size.height])
    }
}

#if BOOX_LENS_APP
@main
enum BooxLensApp {
    static func main() {
        do {
            let arguments = try Arguments.parse()
            if arguments.mode == .capture {
                try runHeadlessCapture(arguments: arguments)
                exit(0)
            }
            let application = NSApplication.shared
            application.setActivationPolicy(.accessory)
            let controller = LensController(arguments: arguments)
            application.delegate = controller
            application.run()
        } catch {
            let message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            FileHandle.standardError.write(Data((message + "\n").utf8))
            exit(2)
        }
    }
}
#endif
