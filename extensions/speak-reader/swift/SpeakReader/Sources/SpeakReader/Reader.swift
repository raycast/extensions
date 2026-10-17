import Cocoa
import AVFoundation

// Speak Reader — floating glass reader with word-level highlighting and Markdown support.

let kSpeeds: [Float] = [1.0, 1.25, 1.5, 1.75, 2.0, 0.75]
let kDefaultVoice = "en-AU-WilliamMultilingualNeural"

struct VoiceOption { let id: String; let name: String; let accent: String }
let kVoices: [VoiceOption] = [
    VoiceOption(id: "en-AU-WilliamMultilingualNeural", name: "William", accent: "Australian"),
    VoiceOption(id: "en-AU-NatashaNeural", name: "Natasha", accent: "Australian"),
    VoiceOption(id: "en-GB-RyanNeural", name: "Ryan", accent: "British"),
    VoiceOption(id: "en-GB-ThomasNeural", name: "Thomas", accent: "British"),
    VoiceOption(id: "en-GB-SoniaNeural", name: "Sonia", accent: "British"),
    VoiceOption(id: "en-GB-LibbyNeural", name: "Libby", accent: "British"),
    VoiceOption(id: "en-IE-ConnorNeural", name: "Connor", accent: "Irish"),
    VoiceOption(id: "en-NZ-MitchellNeural", name: "Mitchell", accent: "New Zealand"),
    VoiceOption(id: "en-US-AndrewMultilingualNeural", name: "Andrew", accent: "American"),
    VoiceOption(id: "en-US-BrianMultilingualNeural", name: "Brian", accent: "American"),
    VoiceOption(id: "en-US-ChristopherNeural", name: "Christopher", accent: "American"),
    VoiceOption(id: "en-US-AvaMultilingualNeural", name: "Ava", accent: "American"),
    VoiceOption(id: "en-US-EmmaMultilingualNeural", name: "Emma", accent: "American"),
]

func voiceDisplayName(_ id: String) -> String {
    if let v = kVoices.first(where: { $0.id == id }) { return v.name }
    let parts = id.split(separator: "-")
    var name = parts.count >= 3 ? parts[2...].joined(separator: "-") : id
    for suffix in ["Neural", "Multilingual"] where name.hasSuffix(suffix) { name = String(name.dropLast(suffix.count)) }
    return name
}

func fmtTime(_ s: Double) -> String {
    let t = max(0, Int(s.rounded()))
    return String(format: "%d:%02d", t / 60, t % 60)
}

func speedLabel(_ s: Float) -> String { String(format: "%g×", s) }

func symbol(_ name: String, _ size: CGFloat, _ weight: NSFont.Weight = .semibold) -> NSImage? {
    NSImage(systemSymbolName: name, accessibilityDescription: nil)?
        .withSymbolConfiguration(NSImage.SymbolConfiguration(pointSize: size, weight: weight))
}

// MARK: - Model

struct Word { let start: Double; let end: Double; let loc: Int; let len: Int }

struct Chunk {
    let url: URL
    let words: [Word]
    let duration: Double
    let textStart: Int
    let textEnd: Int
}

struct StyleSpan { let range: NSRange; let kind: [String] }

// MARK: - Views

final class ReaderPanel: NSPanel {
    override var canBecomeKey: Bool { true }
}

/// Draws text background highlights as rounded pills.
final class RoundedLayoutManager: NSLayoutManager {
    var pillColor: NSColor?
    override func fillBackgroundRectArray(_ rectArray: UnsafePointer<NSRect>, count rectCount: Int,
                                          forCharacterRange charRange: NSRange, color: NSColor) {
        // Only the word highlight is a pill; table borders/backgrounds draw normally.
        guard let pill = pillColor, color.isEqual(pill) else {
            super.fillBackgroundRectArray(rectArray, count: rectCount, forCharacterRange: charRange, color: color)
            return
        }
        color.setFill()
        for i in 0..<rectCount {
            let r = rectArray[i].insetBy(dx: -2.5, dy: -0.5)
            NSBezierPath(roundedRect: r, xRadius: 4, yRadius: 4).fill()
        }
    }
}

/// Text block with a rounded background (code) or a leading accent bar (quotes).
final class RoundedBlock: NSTextBlock {
    var fill: NSColor = .clear
    var bar: NSColor?
    override init() { super.init() }
    required init?(coder: NSCoder) { super.init(coder: coder) }
    override func copy(with zone: NSZone? = nil) -> Any {
        let c = super.copy(with: zone)
        if let b = c as? RoundedBlock { b.fill = fill; b.bar = bar }
        return c
    }
    override func drawBackground(withFrame frameRect: NSRect, in controlView: NSView?,
                                 characterRange charRange: NSRange, layoutManager: NSLayoutManager) {
        let r = frameRect.insetBy(dx: 0, dy: 1)
        if let bar = bar {
            bar.setFill()
            NSBezierPath(roundedRect: NSRect(x: r.minX, y: r.minY, width: 2.5, height: r.height), xRadius: 1.25, yRadius: 1.25).fill()
        } else {
            fill.setFill()
            NSBezierPath(roundedRect: r, xRadius: 7, yRadius: 7).fill()
            NSColor.white.withAlphaComponent(0.06).setStroke()
            let p = NSBezierPath(roundedRect: r.insetBy(dx: 0.5, dy: 0.5), xRadius: 6.5, yRadius: 6.5)
            p.lineWidth = 1
            p.stroke()
        }
    }
}

final class ReaderTextView: NSTextView {
    var onClickIndex: ((Int) -> Void)?
    override var acceptsFirstResponder: Bool { false }
    override var mouseDownCanMoveWindow: Bool { false }
    override func mouseDown(with event: NSEvent) {
        let p = convert(event.locationInWindow, from: nil)
        onClickIndex?(characterIndexForInsertion(at: p))
    }
    override func resetCursorRects() { addCursorRect(visibleRect, cursor: .pointingHand) }
}

/// Scroll view with soft fading top/bottom edges; remembers manual scrolling.
final class ReaderScrollView: NSScrollView {
    var lastUserScroll = Date.distantPast
    private let fade = CAGradientLayer()
    override func scrollWheel(with event: NSEvent) {
        lastUserScroll = Date()
        super.scrollWheel(with: event)
    }
    override func layout() {
        super.layout()
        wantsLayer = true
        guard let layer = layer else { return }
        let h = max(bounds.height, 1), f: CGFloat = 14
        CATransaction.begin(); CATransaction.setDisableActions(true)
        fade.frame = bounds
        fade.colors = [NSColor.clear.cgColor, NSColor.black.cgColor, NSColor.black.cgColor, NSColor.clear.cgColor]
        fade.locations = [0, NSNumber(value: Double(f / h)), NSNumber(value: Double(1 - f / h)), 1]
        layer.mask = fade
        CATransaction.commit()
    }
}

class HoverButton: NSButton {
    var baseFill: NSColor?
    var hoverFill = NSColor.white.withAlphaComponent(0.13)
    var radius: CGFloat = 6
    private var hovering = false { didSet { needsDisplay = true } }
    private var area: NSTrackingArea?

    override var mouseDownCanMoveWindow: Bool { false }
    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        if let a = area { removeTrackingArea(a) }
        let a = NSTrackingArea(rect: .zero, options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect], owner: self)
        addTrackingArea(a); area = a
    }
    override func mouseEntered(with event: NSEvent) { hovering = true }
    override func mouseExited(with event: NSEvent) { hovering = false }
    override func draw(_ dirtyRect: NSRect) {
        if let fill = (hovering && isEnabled) ? hoverFill : baseFill {
            fill.setFill()
            NSBezierPath(roundedRect: bounds, xRadius: radius, yRadius: radius).fill()
        }
        super.draw(dirtyRect)
    }
}

final class WaveView: NSView {
    var active = false { didSet { needsDisplay = true } }
    private var phase: CGFloat = 0
    func step() { if active { phase += 0.16; needsDisplay = true } }
    override func draw(_ dirtyRect: NSRect) {
        let n = 4, bw: CGFloat = 2.2, gap: CGFloat = 1.8
        let total = CGFloat(n) * bw + CGFloat(n - 1) * gap
        var x = (bounds.width - total) / 2
        NSColor.controlAccentColor.setFill()
        for i in 0..<n {
            let k = CGFloat(i)
            let amp: CGFloat = active ? 0.3 + 0.7 * abs(sin(phase * (1 + 0.27 * k) + k * 1.1)) : 0.28
            let h = max(bw, bounds.height * amp)
            NSBezierPath(roundedRect: NSRect(x: x, y: (bounds.height - h) / 2, width: bw, height: h),
                         xRadius: bw / 2, yRadius: bw / 2).fill()
            x += bw + gap
        }
    }
}

final class ProgressBar: NSView {
    var fraction: CGFloat = 0 { didSet { if !dragging { needsDisplay = true } } }
    var buffered: CGFloat = 0 { didSet { if buffered != oldValue { needsDisplay = true } } }
    var onSeek: ((CGFloat) -> Void)?
    private var dragFraction: CGFloat = 0
    private(set) var dragging = false
    private var hovering = false { didSet { needsDisplay = true } }
    private var area: NSTrackingArea?

    override var mouseDownCanMoveWindow: Bool { false }
    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        if let a = area { removeTrackingArea(a) }
        let a = NSTrackingArea(rect: .zero, options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect], owner: self)
        addTrackingArea(a); area = a
    }
    override func mouseEntered(with event: NSEvent) { hovering = true }
    override func mouseExited(with event: NSEvent) { hovering = false }
    private func frac(_ e: NSEvent) -> CGFloat {
        min(1, max(0, convert(e.locationInWindow, from: nil).x / max(1, bounds.width)))
    }
    override func mouseDown(with e: NSEvent) { dragging = true; dragFraction = frac(e); needsDisplay = true }
    override func mouseDragged(with e: NSEvent) { dragFraction = frac(e); needsDisplay = true }
    override func mouseUp(with e: NSEvent) {
        dragging = false
        fraction = frac(e)
        onSeek?(fraction)
    }
    override func draw(_ dirtyRect: NSRect) {
        let h: CGFloat = (hovering || dragging) ? 5 : 3
        let track = NSRect(x: 0, y: (bounds.height - h) / 2, width: bounds.width, height: h)
        func pill(_ r: NSRect, _ c: NSColor) { c.setFill(); NSBezierPath(roundedRect: r, xRadius: h / 2, yRadius: h / 2).fill() }
        pill(track, NSColor.white.withAlphaComponent(0.10))
        var b = track; b.size.width = bounds.width * buffered
        if b.width > 0 { pill(b, NSColor.white.withAlphaComponent(0.12)) }
        let f = dragging ? dragFraction : fraction
        var p = track; p.size.width = max(h, bounds.width * f)
        pill(p, NSColor.white.withAlphaComponent(0.88))
        if hovering || dragging {
            let r: CGFloat = 5.5
            NSColor.white.setFill()
            NSBezierPath(ovalIn: NSRect(x: p.maxX - r, y: bounds.midY - r, width: r * 2, height: r * 2)).fill()
        }
    }
}

// MARK: - Controller

final class Controller: NSObject, NSWindowDelegate {
    let rawText: String
    let text: String          // display text (Markdown markers removed)
    let ns: NSString
    let styles: [StyleSpan]
    let docUnits: [NSRange]
    let speechUnits: [SpeechUnit]
    let textPath: String
    let deleteInput: Bool
    var voice: String
    let rate: String
    let workDir: URL
    var genDir: URL
    var generation = 0
    var genStartLoc = 0
    var baseElapsed: Double = 0
    var lastElapsed: Double = 0
    var worker: SpeechGenerator?

    var chunks: [Chunk] = []
    var chunkStartTime: [Double] = []
    var genDone = false
    var genError = false
    var sentences: [NSRange] = []

    let player = AVQueuePlayer()
    var itemIndex: [ObjectIdentifier: Int] = [:]
    var queuedThrough = -1
    var lastChunk = 0
    var wantsPlay = true
    var started = false
    var finished = false
    var speed: Float
    var fontScale: CGFloat
    var finishWork: DispatchWorkItem?
    var closing = false
    /// A text position the user clicked before its audio had loaded; jumped to once it arrives.
    var pendingSeek: Int?
    /// Set when the text has nothing speakable, so the window closes instead of waiting forever.
    var nothingToRead = false
    /// How many times in a row reading has picked up again after the voice service dropped out.
    var autoRetries = 0

    var curWord = NSRange(location: NSNotFound, length: 0)
    var curSentence = NSRange(location: NSNotFound, length: 0)
    var curWordLoc = 0
    var readEnd = 0

    let unreadColor = NSColor.white.withAlphaComponent(0.40)
    let readColor = NSColor.white.withAlphaComponent(0.72)
    let currentColor = NSColor.white
    let wordBG = NSColor.controlAccentColor.withAlphaComponent(0.5)

    var panel: ReaderPanel!
    var textView: ReaderTextView!
    var scroll: ReaderScrollView!
    var titleLabel: NSTextField!
    var wave: WaveView!
    var spinner: NSProgressIndicator!
    var speedButton: HoverButton!
    var menuButton: HoverButton!
    var playButton: HoverButton!
    var progress: ProgressBar!
    var elapsedLabel: NSTextField!
    var remainLabel: NSTextField!
    var timer: Timer?
    var keyMonitor: Any?
    var lastStatus = ""
    var flashText = ""
    var flashUntil = Date.distantPast

    init(textPath: String, voice: String, rate: String, tableHeaders: Bool, deleteInput: Bool) {
        self.textPath = textPath
        self.deleteInput = deleteInput
        // "auto" = the voice last picked in the reader's menu.
        if voice == "auto" || voice.isEmpty {
            let saved = UserDefaults.standard.string(forKey: "voice")
            self.voice = (saved != nil && kVoices.contains { $0.id == saved }) ? saved! : kDefaultVoice
        } else {
            self.voice = voice
        }
        self.rate = rate
        workDir = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("speak-reader-\(getpid())")
        genDir = workDir
        try? FileManager.default.createDirectory(at: workDir, withIntermediateDirectories: true)

        rawText = (try? String(contentsOfFile: textPath, encoding: .utf8)) ?? ""
        // Markdown → clean display text + formatting + speech units.
        let doc = MarkdownPrep.build(rawText, repeatTableHeaders: tableHeaders)
        text = doc.display
        ns = doc.display as NSString
        styles = doc.styles.map {
            StyleSpan(range: NSRange(location: $0.start, length: $0.end - $0.start), kind: $0.kind.split(separator: ":").map(String.init))
        }
        speechUnits = doc.units
        docUnits = doc.units.map { NSRange(location: $0.start, length: $0.end - $0.start) }

        let s = UserDefaults.standard.float(forKey: "speed")
        speed = kSpeeds.contains(s) ? s : 1.0
        let fs = UserDefaults.standard.double(forKey: "fontScale")
        fontScale = (fs >= 0.8 && fs <= 1.6) ? CGFloat(fs) : 1.0
        super.init()
    }

    // MARK: Lifecycle

    func start() {
        if !docUnits.isEmpty {
            sentences = docUnits
        } else {
            ns.enumerateSubstrings(in: NSRange(location: 0, length: ns.length), options: [.bySentences, .substringNotRequired]) { _, r, _, _ in
                self.sentences.append(r)
            }
        }
        if sentences.isEmpty { sentences = [NSRange(location: 0, length: ns.length)] }

        player.actionAtItemEnd = .advance
        player.defaultRate = speed
        NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: nil, queue: .main) { [weak self] n in
            self?.itemEnded(n.object as? AVPlayerItem)
        }

        buildWindow()
        startWorker(from: 0)
        updateStatus()
        let t = Timer(timeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in self?.tick() }
        RunLoop.main.add(t, forMode: .common)
        timer = t

        keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] e in
            guard let self = self else { return e }
            let c = e.charactersIgnoringModifiers?.lowercased() ?? ""
            if e.modifierFlags.contains(.command) {
                switch c {
                case "w": self.close()
                case "c": self.copyText()
                case "=", "+": self.biggerText()
                case "-": self.smallerText()
                case "0": self.setScale(1.0)
                default: return e
                }
                return nil
            }
            switch e.keyCode {
            case 49: self.togglePause(); return nil          // space
            case 53: self.close(); return nil                // esc
            case 123: self.skipSentence(-1); return nil      // ←
            case 124: self.skipSentence(1); return nil       // →
            default:
                if c == "s" { self.cycleSpeed(); return nil }
                return e
            }
        }
    }

    func startWorker(from loc: Int) {
        generation += 1
        genDir = workDir.appendingPathComponent("g\(generation)")
        genStartLoc = loc
        try? FileManager.default.createDirectory(at: genDir, withIntermediateDirectories: true)
        let g = SpeechGenerator(units: speechUnits, voice: voice, rate: rate, outDir: genDir, from: loc)
        worker = g
        g.start()
    }

    /// Re-synthesise from a text position (used after a voice change or seeking before the start).
    func restartGeneration(from loc: Int) {
        baseElapsed = started ? lastElapsed : baseElapsed
        worker?.cancel()
        player.removeAllItems()
        itemIndex = [:]
        chunks = []
        chunkStartTime = []
        queuedThrough = -1
        lastChunk = 0
        genDone = false
        genError = false
        started = false
        finished = false
        pendingSeek = nil
        finishWork?.cancel()
        wantsPlay = true
        startWorker(from: max(0, min(loc, ns.length)))
        scroll.lastUserScroll = .distantPast
        lastStatus = ""
        updateStatus()
    }

    @objc func close() {
        guard !closing else { return }
        closing = true
        player.pause()
        worker?.cancel()
        timer?.invalidate()
        NSAnimationContext.runAnimationGroup({ ctx in
            ctx.duration = 0.16
            panel.animator().alphaValue = 0
        }, completionHandler: {
            try? FileManager.default.removeItem(at: self.workDir)
            if self.deleteInput { try? FileManager.default.removeItem(atPath: self.textPath) }
            NSApp.terminate(nil)
        })
    }

    // MARK: Window

    func label(_ s: String, size: CGFloat, weight: NSFont.Weight = .regular, color: NSColor) -> NSTextField {
        let l = NSTextField(labelWithString: s)
        l.font = NSFont.monospacedDigitSystemFont(ofSize: size, weight: weight)
        l.textColor = color
        l.lineBreakMode = .byTruncatingTail
        return l
    }

    func iconButton(_ name: String, size: CGFloat, action: Selector, frame: NSRect) -> HoverButton {
        let b = HoverButton(frame: frame)
        b.image = symbol(name, size)
        b.imagePosition = .imageOnly
        b.isBordered = false
        b.contentTintColor = NSColor.white.withAlphaComponent(0.75)
        b.target = self
        b.action = action
        return b
    }

    func roundedMask(_ radius: CGFloat) -> NSImage {
        let edge = radius * 2 + 1
        let img = NSImage(size: NSSize(width: edge, height: edge), flipped: false) { r in
            NSColor.black.setFill()
            NSBezierPath(roundedRect: r, xRadius: radius, yRadius: radius).fill()
            return true
        }
        img.capInsets = NSEdgeInsets(top: radius, left: radius, bottom: radius, right: radius)
        img.resizingMode = .stretch
        return img
    }

    func buildWindow() {
        let W: CGFloat = 360, H: CGFloat = 232
        let headerH: CGFloat = 38, footerH: CGFloat = 66
        let radius: CGFloat = 16

        panel = ReaderPanel(contentRect: NSRect(x: 0, y: 0, width: W, height: H),
                            styleMask: [.borderless, .resizable, .nonactivatingPanel],
                            backing: .buffered, defer: false)
        panel.level = .floating
        panel.hidesOnDeactivate = false
        panel.isReleasedWhenClosed = false
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.isMovableByWindowBackground = true
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.appearance = NSAppearance(named: .darkAqua)
        panel.minSize = NSSize(width: 280, height: 150)
        panel.delegate = self

        // Frosted glass, Raycast-style.
        let fx = NSVisualEffectView(frame: NSRect(x: 0, y: 0, width: W, height: H))
        fx.material = .hudWindow
        fx.blendingMode = .behindWindow
        fx.state = .active
        fx.maskImage = roundedMask(radius)
        fx.autoresizingMask = [.width, .height]
        panel.contentView = fx

        let tint = NSView(frame: fx.bounds)
        tint.wantsLayer = true
        tint.layer?.backgroundColor = NSColor(white: 0.07, alpha: 0.45).cgColor
        tint.layer?.cornerRadius = radius
        tint.layer?.cornerCurve = .continuous
        tint.layer?.borderWidth = 1
        tint.layer?.borderColor = NSColor.white.withAlphaComponent(0.10).cgColor
        tint.autoresizingMask = [.width, .height]
        fx.addSubview(tint)
        let content = fx

        // Header
        wave = WaveView(frame: NSRect(x: 14, y: H - 26, width: 16, height: 14))
        wave.autoresizingMask = [.minYMargin]
        content.addSubview(wave)

        spinner = NSProgressIndicator(frame: NSRect(x: 15, y: H - 26, width: 14, height: 14))
        spinner.style = .spinning
        spinner.controlSize = .small
        spinner.isDisplayedWhenStopped = false
        spinner.autoresizingMask = [.minYMargin]
        content.addSubview(spinner)

        titleLabel = label("", size: 12, color: .white)
        titleLabel.frame = NSRect(x: 38, y: H - 27, width: W - 38 - 118, height: 16)
        titleLabel.autoresizingMask = [.width, .minYMargin]
        content.addSubview(titleLabel)

        speedButton = HoverButton(frame: NSRect(x: W - 110, y: H - 29, width: 42, height: 20))
        speedButton.isBordered = false
        speedButton.baseFill = NSColor.white.withAlphaComponent(0.09)
        speedButton.hoverFill = NSColor.white.withAlphaComponent(0.18)
        speedButton.radius = 10
        speedButton.target = self
        speedButton.action = #selector(cycleSpeed)
        speedButton.autoresizingMask = [.minXMargin, .minYMargin]
        speedButton.toolTip = "Playback speed (S)"
        content.addSubview(speedButton)
        updateSpeedButton()

        menuButton = iconButton("ellipsis", size: 11, action: #selector(showMenu(_:)), frame: NSRect(x: W - 62, y: H - 29, width: 24, height: 20))
        menuButton.radius = 10
        menuButton.autoresizingMask = [.minXMargin, .minYMargin]
        menuButton.toolTip = "Voice, speed, text size and more"
        content.addSubview(menuButton)

        let closeBtn = iconButton("xmark", size: 10, action: #selector(close), frame: NSRect(x: W - 36, y: H - 29, width: 22, height: 20))
        closeBtn.radius = 10
        closeBtn.autoresizingMask = [.minXMargin, .minYMargin]
        closeBtn.toolTip = "Close (Esc)"
        content.addSubview(closeBtn)

        // Text
        scroll = ReaderScrollView(frame: NSRect(x: 0, y: footerH, width: W, height: H - headerH - footerH))
        scroll.autoresizingMask = [.width, .height]
        scroll.hasVerticalScroller = true
        scroll.scrollerStyle = .overlay
        scroll.drawsBackground = false
        scroll.contentView.drawsBackground = false

        let storage = NSTextStorage()
        let lm = RoundedLayoutManager()
        lm.pillColor = wordBG
        storage.addLayoutManager(lm)
        let container = NSTextContainer(containerSize: NSSize(width: W, height: .greatestFiniteMagnitude))
        container.widthTracksTextView = true
        lm.addTextContainer(container)
        textView = ReaderTextView(frame: scroll.contentView.bounds, textContainer: container)
        textView.minSize = NSSize(width: 0, height: 0)
        textView.maxSize = NSSize(width: CGFloat.greatestFiniteMagnitude, height: .greatestFiniteMagnitude)
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]
        textView.isEditable = false
        textView.isSelectable = false
        textView.drawsBackground = false
        textView.textContainerInset = NSSize(width: 12, height: 10)
        textView.onClickIndex = { [weak self] i in self?.clickedText(at: i) }
        scroll.documentView = textView
        content.addSubview(scroll)
        storage.setAttributedString(renderAttributed())

        // Footer
        progress = ProgressBar(frame: NSRect(x: 14, y: 40, width: W - 28, height: 14))
        progress.autoresizingMask = [.width, .maxYMargin]
        progress.onSeek = { [weak self] f in self?.seekFraction(f) }
        content.addSubview(progress)

        elapsedLabel = label("0:00", size: 10.5, weight: .medium, color: NSColor.white.withAlphaComponent(0.45))
        elapsedLabel.frame = NSRect(x: 14, y: 14, width: 60, height: 14)
        elapsedLabel.autoresizingMask = [.maxXMargin, .maxYMargin]
        content.addSubview(elapsedLabel)

        remainLabel = label("", size: 10.5, weight: .medium, color: NSColor.white.withAlphaComponent(0.45))
        remainLabel.alignment = .right
        remainLabel.frame = NSRect(x: W - 74, y: 14, width: 60, height: 14)
        remainLabel.autoresizingMask = [.minXMargin, .maxYMargin]
        content.addSubview(remainLabel)

        let cx = W / 2
        let prev = iconButton("backward.fill", size: 11, action: #selector(prevSentence), frame: NSRect(x: cx - 52, y: 9, width: 30, height: 24))
        prev.toolTip = "Previous sentence (←)"
        let next = iconButton("forward.fill", size: 11, action: #selector(nextSentence), frame: NSRect(x: cx + 22, y: 9, width: 30, height: 24))
        next.toolTip = "Next sentence (→)"
        playButton = iconButton("pause.fill", size: 12, action: #selector(togglePause), frame: NSRect(x: cx - 15, y: 6, width: 30, height: 30))
        playButton.baseFill = NSColor.white.withAlphaComponent(0.92)
        playButton.hoverFill = .white
        playButton.radius = 15
        playButton.contentTintColor = .black
        playButton.toolTip = "Pause / play (Space)"
        for b in [prev, next, playButton!] {
            b.autoresizingMask = [.minXMargin, .maxXMargin, .maxYMargin]
            content.addSubview(b)
        }

        // Position: last place the user left it, otherwise top-left.
        var frame = NSRect(x: 0, y: 0, width: W, height: H)
        if let vf = NSScreen.main?.visibleFrame {
            frame.origin = NSPoint(x: vf.minX + 16, y: vf.maxY - H - 16)
        }
        if let s = UserDefaults.standard.string(forKey: "frame") {
            let f = NSRectFromString(s)
            if f.width >= 280, f.height >= 150, NSScreen.screens.contains(where: { $0.visibleFrame.intersects(f) }) { frame = f }
        }
        panel.setFrame(frame.offsetBy(dx: 0, dy: 8), display: false)
        panel.alphaValue = 0
        panel.orderFrontRegardless()
        // Take keyboard focus straight away (without activating the app) so Space, ←/→, S and Esc
        // work immediately, like a Raycast window. Clicking back into another app hands focus back.
        panel.makeKey()
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.22
            ctx.timingFunction = CAMediaTimingFunction(name: .easeOut)
            panel.animator().setFrame(frame, display: true)
            panel.animator().alphaValue = 1
        }
        panel.invalidateShadow()
    }

    func windowDidMove(_ notification: Notification) { saveFrame() }
    func windowDidResize(_ notification: Notification) { saveFrame() }
    func saveFrame() {
        guard panel.alphaValue > 0.99, !closing else { return }
        UserDefaults.standard.set(NSStringFromRect(panel.frame), forKey: "frame")
    }

    // MARK: Rendering (Markdown styles)

    func renderAttributed() -> NSAttributedString {
        let k = fontScale
        let base = NSMutableParagraphStyle()
        base.lineSpacing = 3 * k
        base.paragraphSpacing = 6 * k
        let s = NSMutableAttributedString(string: text, attributes: [
            .font: NSFont.systemFont(ofSize: 12.5 * k), .foregroundColor: unreadColor, .paragraphStyle: base])
        let fm = NSFontManager.shared
        var tables: [String: NSTextTable] = [:]

        func para(_ r: NSRange, _ f: (NSMutableParagraphStyle) -> Void) {
            let ps = base.mutableCopy() as! NSMutableParagraphStyle
            f(ps)
            s.addAttribute(.paragraphStyle, value: ps, range: r)
        }
        func fonts(_ r: NSRange, _ f: @escaping (NSFont) -> NSFont) {
            s.enumerateAttribute(.font, in: r) { v, sub, _ in
                if let font = v as? NSFont { s.addAttribute(.font, value: f(font), range: sub) }
            }
        }

        // Outer ranges first so inner styles (bold inside a heading, code inside a cell…) layer on top.
        for st in styles.sorted(by: { $0.range.length > $1.range.length }) {
            let r = st.range
            guard r.length > 0, r.location >= 0, NSMaxRange(r) <= s.length, let kind = st.kind.first else { continue }
            switch kind {
            case "h1", "h2", "h3", "h4", "h5", "h6":
                let lvl = Int(kind.dropFirst()) ?? 3
                let sizes: [CGFloat] = [17, 15, 13.5, 12.5, 12.5, 12.5]
                s.addAttribute(.font, value: NSFont.systemFont(ofSize: sizes[lvl - 1] * k, weight: lvl <= 2 ? .bold : .semibold), range: r)
                para(r) { ps in
                    ps.paragraphSpacingBefore = r.location > 0 ? (lvl <= 2 ? 9 : 5) * k : 0
                    ps.paragraphSpacing = 4 * k
                }
            case "b": fonts(r) { fm.convert($0, toHaveTrait: .boldFontMask) }
            case "i": fonts(r) { fm.convert($0, toHaveTrait: .italicFontMask) }
            case "s": s.addAttribute(.strikethroughStyle, value: NSUnderlineStyle.single.rawValue, range: r)
            case "link":
                s.addAttribute(.underlineStyle, value: NSUnderlineStyle.single.rawValue, range: r)
                s.addAttribute(.underlineColor, value: NSColor.controlAccentColor.withAlphaComponent(0.7), range: r)
            case "code":
                fonts(r) { f in
                    NSFont.monospacedSystemFont(ofSize: f.pointSize * 0.9,
                                                weight: fm.traits(of: f).contains(.boldFontMask) ? .semibold : .regular)
                }
            case "codeblock":
                s.addAttribute(.font, value: NSFont.monospacedSystemFont(ofSize: 11 * k, weight: .regular), range: r)
                let blk = RoundedBlock()
                blk.fill = NSColor.white.withAlphaComponent(0.06)
                blk.setContentWidth(100, type: .percentageValueType)
                blk.setWidth(7 * k, type: .absoluteValueType, for: .padding)
                blk.setWidth(10 * k, type: .absoluteValueType, for: .padding, edge: .minX)
                blk.setWidth(10 * k, type: .absoluteValueType, for: .padding, edge: .maxX)
                blk.setWidth(2 * k, type: .absoluteValueType, for: .margin, edge: .minY)
                blk.setWidth(7 * k, type: .absoluteValueType, for: .margin, edge: .maxY)
                para(r) { ps in
                    ps.textBlocks = [blk]
                    ps.lineSpacing = 2 * k
                    ps.paragraphSpacing = 0
                }
            case "quote":
                fonts(r) { fm.convert($0, toHaveTrait: .italicFontMask) }
                let blk = RoundedBlock()
                blk.bar = NSColor.controlAccentColor.withAlphaComponent(0.85)
                blk.setContentWidth(100, type: .percentageValueType)
                blk.setWidth(12 * k, type: .absoluteValueType, for: .padding, edge: .minX)
                blk.setWidth(1, type: .absoluteValueType, for: .padding, edge: .minY)
                blk.setWidth(1, type: .absoluteValueType, for: .padding, edge: .maxY)
                blk.setWidth(6 * k, type: .absoluteValueType, for: .margin, edge: .maxY)
                para(r) { ps in ps.textBlocks = [blk]; ps.paragraphSpacing = 2 * k }
            case "li":
                let level = CGFloat(Int(st.kind.count > 1 ? st.kind[1] : "0") ?? 0)
                let numbered = st.kind.count > 2 && st.kind[2] == "1"
                let indent = level * 16 * k
                let tab = indent + (numbered ? 18 : 13) * k
                para(r) { ps in
                    ps.firstLineHeadIndent = indent
                    ps.headIndent = tab
                    ps.tabStops = [NSTextTab(textAlignment: .left, location: tab, options: [:])]
                    ps.defaultTabInterval = tab
                    ps.paragraphSpacing = 3.5 * k
                }
            case "cell":
                guard st.kind.count >= 6, let row = Int(st.kind[2]), let col = Int(st.kind[3]),
                      let n = Int(st.kind[4]) else { continue }
                let header = st.kind[5] == "1"
                let table: NSTextTable
                if let t = tables[st.kind[1]] { table = t } else {
                    table = NSTextTable()
                    table.numberOfColumns = n
                    table.collapsesBorders = true
                    table.hidesEmptyCells = false
                    table.setContentWidth(100, type: .percentageValueType)
                    table.setWidth(8 * k, type: .absoluteValueType, for: .margin, edge: .maxY)
                    tables[st.kind[1]] = table
                }
                let cell = NSTextTableBlock(table: table, startingRow: row, rowSpan: 1, startingColumn: col, columnSpan: 1)
                cell.setWidth(4 * k, type: .absoluteValueType, for: .padding)
                cell.setWidth(7 * k, type: .absoluteValueType, for: .padding, edge: .minX)
                cell.setWidth(7 * k, type: .absoluteValueType, for: .padding, edge: .maxX)
                cell.setWidth(0.5, type: .absoluteValueType, for: .border)
                cell.setBorderColor(NSColor.white.withAlphaComponent(0.14))
                if header { cell.backgroundColor = NSColor.white.withAlphaComponent(0.07) }
                s.addAttribute(.font, value: NSFont.systemFont(ofSize: 11.5 * k, weight: header ? .semibold : .regular), range: r)
                para(r) { ps in
                    ps.textBlocks = [cell]
                    ps.paragraphSpacing = 0
                    ps.lineSpacing = 1.5 * k
                }
            default: break
            }
        }
        return s
    }

    func rerender() {
        textView.textStorage?.setAttributedString(renderAttributed())
        readEnd = 0
        curWord = NSRange(location: NSNotFound, length: 0)
        curSentence = NSRange(location: NSNotFound, length: 0)
        if finished { applyHighlight(word: curWord, sentence: NSRange(location: ns.length, length: 0)) }
    }

    // MARK: Status

    func flash(_ s: String) {
        flashText = s
        flashUntil = Date().addingTimeInterval(1.4)
        updateStatus()
    }

    func updateStatus() {
        var state: String
        var loading = false
        if Date() < flashUntil { state = flashText }
        else if chunks.isEmpty && genError { state = "Couldn't reach voice service" }
        else if chunks.isEmpty && genDone { state = "Nothing to read" }
        else if chunks.isEmpty { state = "Preparing…"; loading = true }
        else if finished { state = "Finished" }
        else if !wantsPlay { state = "Paused" }
        else if player.currentItem == nil && started { state = genError ? "Connection lost" : "Buffering…"; loading = !genError }
        else { state = "Reading" }

        let key = voice + state + "\(loading)\(wantsPlay)\(finished)"
        if key == lastStatus { return }
        lastStatus = key

        let a = NSMutableAttributedString(string: voiceDisplayName(voice), attributes: [
            .font: NSFont.systemFont(ofSize: 12, weight: .semibold), .foregroundColor: NSColor.white.withAlphaComponent(0.92)])
        a.append(NSAttributedString(string: "  ·  " + state, attributes: [
            .font: NSFont.systemFont(ofSize: 11.5, weight: .regular), .foregroundColor: NSColor.white.withAlphaComponent(0.45)]))
        titleLabel.attributedStringValue = a

        if loading { spinner.startAnimation(nil); wave.isHidden = true } else { spinner.stopAnimation(nil); wave.isHidden = false }
        wave.active = (state == "Reading")
        playButton.image = symbol((wantsPlay && !finished) ? "pause.fill" : "play.fill", 12)
    }

    func updateSpeedButton() {
        speedButton.attributedTitle = NSAttributedString(string: speedLabel(speed), attributes: [
            .font: NSFont.monospacedDigitSystemFont(ofSize: 10.5, weight: .semibold),
            .foregroundColor: NSColor.white.withAlphaComponent(0.85)])
    }

    // MARK: Menu

    @objc func showMenu(_ sender: NSButton) {
        let m = NSMenu()
        m.autoenablesItems = false
        m.appearance = NSAppearance(named: .darkAqua)
        func item(_ title: String, _ icon: String?, _ action: Selector?, key: String = "", obj: Any? = nil, on: Bool = false) -> NSMenuItem {
            let it = NSMenuItem(title: title, action: action, keyEquivalent: key)
            it.target = self
            if let icon = icon { it.image = symbol(icon, 13, .regular) }
            it.representedObject = obj
            it.state = on ? .on : .off
            return it
        }

        let voices = NSMenu()
        voices.autoenablesItems = false
        var accent = ""
        for v in kVoices {
            if v.accent != accent {
                if !accent.isEmpty { voices.addItem(.separator()) }
                if #available(macOS 14.0, *) {
                    voices.addItem(NSMenuItem.sectionHeader(title: v.accent))
                } else {
                    let header = NSMenuItem(title: v.accent, action: nil, keyEquivalent: "")
                    header.isEnabled = false
                    voices.addItem(header)
                }
                accent = v.accent
            }
            voices.addItem(item(v.name, nil, #selector(pickVoice(_:)), obj: v.id, on: v.id == voice))
        }
        let vi = item("Voice", "person.wave.2", nil)
        vi.submenu = voices
        m.addItem(vi)

        let speeds = NSMenu()
        speeds.autoenablesItems = false
        for sp in kSpeeds.sorted() {
            speeds.addItem(item(speedLabel(sp), nil, #selector(pickSpeed(_:)), obj: NSNumber(value: sp), on: sp == speed))
        }
        let si = item("Speed", "gauge.with.dots.needle.67percent", nil)
        si.submenu = speeds
        m.addItem(si)

        m.addItem(.separator())
        m.addItem(item("Larger Text", "textformat.size.larger", #selector(biggerText), key: "+"))
        m.addItem(item("Smaller Text", "textformat.size.smaller", #selector(smallerText), key: "-"))
        m.addItem(.separator())
        m.addItem(item("Read from Start", "arrow.counterclockwise", #selector(readFromStart)))
        m.addItem(item("Copy Text", "doc.on.doc", #selector(copyText), key: "c"))
        m.addItem(.separator())
        m.addItem(item("Close", "xmark.circle", #selector(close), key: "w"))

        let y: CGFloat = sender.isFlipped ? sender.bounds.height + 5 : -5
        m.popUp(positioning: nil, at: NSPoint(x: 0, y: y), in: sender)
    }

    @objc func pickVoice(_ item: NSMenuItem) {
        guard let id = item.representedObject as? String, id != voice else { return }
        voice = id
        UserDefaults.standard.set(id, forKey: "voice")
        let loc = finished ? 0 : (curSentence.location != NSNotFound ? curSentence.location : genStartLoc)
        restartGeneration(from: loc)
    }

    @objc func pickSpeed(_ item: NSMenuItem) {
        if let n = item.representedObject as? NSNumber { setSpeed(n.floatValue) }
    }

    @objc func biggerText() { setScale(fontScale + 0.1) }
    @objc func smallerText() { setScale(fontScale - 0.1) }

    func setScale(_ v: CGFloat) {
        let nv = min(1.6, max(0.8, (v * 10).rounded() / 10))
        guard nv != fontScale else { return }
        fontScale = nv
        UserDefaults.standard.set(Double(nv), forKey: "fontScale")
        rerender()
        flash("Text \(Int((nv * 100).rounded()))%")
    }

    @objc func copyText() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(rawText, forType: .string)
        flash("Copied")
    }

    @objc func readFromStart() {
        if genStartLoc > 0 { restartGeneration(from: 0) } else if started { seek(toTextLocation: 0) }
    }

    // MARK: Generation polling

    func pollWorker() {
        let fm = FileManager.default
        while true {
            let n = chunks.count
            let json = genDir.appendingPathComponent(String(format: "chunk-%03d.json", n))
            guard fm.fileExists(atPath: json.path),
                  let data = try? Data(contentsOf: json),
                  let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { break }
            let mp3 = genDir.appendingPathComponent(String(format: "chunk-%03d.mp3", n))
            let raw = obj["words"] as? [[Double]] ?? []
            let words = raw.compactMap { a -> Word? in
                a.count == 4 ? Word(start: a[0], end: a[1], loc: Int(a[2]), len: Int(a[3])) : nil
            }
            let dur = (try? AVAudioPlayer(contentsOf: mp3).duration) ?? (words.last?.end ?? 0)
            chunkStartTime.append((chunkStartTime.last ?? 0) + (chunks.last?.duration ?? 0))
            chunks.append(Chunk(url: mp3, words: words, duration: dur,
                                textStart: obj["start"] as? Int ?? 0, textEnd: obj["end"] as? Int ?? ns.length))

            autoRetries = 0

            if started && queuedThrough == n - 1 {
                // If playback had caught up and run dry, the player must be told to start again:
                // its rate can still read as "playing" even though there was nothing left to play.
                let ranDry = player.currentItem == nil
                player.insert(makeItem(n), after: nil)
                queuedThrough = n
                if wantsPlay && !finished && (ranDry || player.rate == 0) { player.playImmediately(atRate: speed) }
            }
        }
        if !genDone && fm.fileExists(atPath: genDir.appendingPathComponent("done").path) { genDone = true }
        if !genError && fm.fileExists(atPath: genDir.appendingPathComponent("error").path) { genError = true }
    }

    // MARK: Playback

    func makeItem(_ i: Int) -> AVPlayerItem {
        let item = AVPlayerItem(url: chunks[i].url)
        item.audioTimePitchAlgorithm = .spectral
        itemIndex[ObjectIdentifier(item)] = i
        return item
    }

    func enqueue(from c: Int, at t: Double) {
        player.removeAllItems()
        for i in c..<chunks.count { player.insert(makeItem(i), after: nil) }
        queuedThrough = chunks.count - 1
        lastChunk = c
        if t > 0.01 {
            player.seek(to: CMTime(seconds: t, preferredTimescale: 1000), toleranceBefore: .zero, toleranceAfter: .zero)
        }
    }

    func itemEnded(_ item: AVPlayerItem?) {
        guard let item = item, let idx = itemIndex[ObjectIdentifier(item)] else { return }
        lastChunk = idx
        if idx == chunks.count - 1 && genDone { finish() }
    }

    func finish() {
        finished = true
        wantsPlay = false
        progress.fraction = 1
        applyHighlight(word: NSRange(location: NSNotFound, length: 0), sentence: NSRange(location: ns.length, length: 0))
        updateStatus()
        let work = DispatchWorkItem { [weak self] in self?.close() }
        finishWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0, execute: work)
    }

    func currentPosition() -> (Int, Double)? {
        guard !chunks.isEmpty else { return nil }
        if let item = player.currentItem, let idx = itemIndex[ObjectIdentifier(item)] {
            lastChunk = idx
            let t = item.currentTime().seconds
            return (idx, t.isFinite ? t : 0)
        }
        let c = min(lastChunk, chunks.count - 1)
        return (c, chunks[c].duration)
    }

    func wordIndex(in c: Int, at t: Double) -> Int? {
        let ws = chunks[c].words
        guard !ws.isEmpty else { return nil }
        var lo = 0, hi = ws.count - 1, ans = 0
        while lo <= hi {
            let m = (lo + hi) / 2
            if ws[m].start <= t + 0.03 { ans = m; lo = m + 1 } else { hi = m - 1 }
        }
        return ans
    }

    func sentenceIndex(for loc: Int) -> Int {
        var lo = 0, hi = sentences.count - 1, ans = 0
        while lo <= hi {
            let m = (lo + hi) / 2
            if sentences[m].location <= loc { ans = m; lo = m + 1 } else { hi = m - 1 }
        }
        return ans
    }

    func tick() {
        guard !closing else { return }
        pollWorker()
        if !started && !chunks.isEmpty {
            started = true
            enqueue(from: 0, at: 0)
            if wantsPlay { player.playImmediately(atRate: speed) }
        }
        // Playback ran dry but newer audio is ready (e.g. it wasn't queued): queue it and carry on.
        if started && !finished && pendingSeek == nil && player.currentItem == nil && lastChunk + 1 < chunks.count {
            enqueue(from: lastChunk + 1, at: 0)
            if wantsPlay { player.playImmediately(atRate: speed) }
        }
        // The voice service dropped out mid-read: once the audio that did arrive has played,
        // pick up again from where it stopped instead of sitting there.
        if started && !finished && genError && wantsPlay && player.currentItem == nil && autoRetries < 3,
           let resume = chunks.last?.textEnd, resume < ns.length {
            autoRetries += 1
            restartGeneration(from: resume)
            flash("Reconnecting…")
        }
        // Nothing speakable (e.g. only a divider line): say so and close rather than spin forever.
        if !started && chunks.isEmpty && genDone && !genError && !nothingToRead {
            nothingToRead = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in self?.close() }
        }
        // A click landed on text whose audio wasn't ready yet: jump there as soon as it is.
        if let p = pendingSeek, started, genDone || (chunks.last?.textEnd ?? 0) > p {
            pendingSeek = nil
            seek(toTextLocation: p)
        }
        // The last chunk can finish playing before the "done" marker is noticed; catch that here.
        if started && !finished && genDone && pendingSeek == nil && player.currentItem == nil
            && lastChunk >= chunks.count - 1 {
            finish()
        }
        wave.step()
        updateStatus()
        progress.buffered = genDone ? 1 : CGFloat(chunks.last?.textEnd ?? genStartLoc) / CGFloat(max(1, ns.length))
        guard started, !finished, let (c, t) = currentPosition() else { return }

        if let i = wordIndex(in: c, at: t) {
            let ws = chunks[c].words
            let w = ws[i]
            let wr = NSRange(location: w.loc, length: w.len)
            let s = sentences[sentenceIndex(for: w.loc)]
            let sentence = NSLocationInRange(w.loc, s) ? s : wr
            let changed = wr != curWord || sentence != curSentence
            applyHighlight(word: wr, sentence: sentence)
            curWordLoc = w.loc
            if changed { scrollToShow(wr.length > 0 ? wr : sentence) }

            var pos = Double(w.loc)
            if i + 1 < ws.count {
                let n = ws[i + 1], span = n.start - w.start
                if span > 0 { pos += min(1, max(0, (t - w.start) / span)) * Double(n.loc - w.loc) }
            } else {
                pos += Double(w.len) * min(1, max(0, (t - w.start) / max(0.01, w.end - w.start)))
            }
            if !progress.dragging { progress.fraction = CGFloat(pos / Double(max(1, ns.length))) }
        }

        let elapsed = baseElapsed + chunkStartTime[c] + t
        lastElapsed = elapsed
        let generated = (chunkStartTime.last ?? 0) + (chunks.last?.duration ?? 0)
        let covered = Double(max(1, (chunks.last?.textEnd ?? 1) - genStartLoc))
        let rest = Double(max(1, ns.length - genStartLoc))
        let total = baseElapsed + (genDone ? generated : generated / covered * rest)
        let sp = Double(speed)
        elapsedLabel.stringValue = fmtTime(elapsed / sp)
        remainLabel.stringValue = "−" + fmtTime(max(0, total - elapsed) / sp)
    }

    // MARK: Highlighting

    func clamp(_ r: NSRange) -> NSRange {
        let len = ns.length
        guard r.location != NSNotFound, r.location < len else { return NSRange(location: len, length: 0) }
        return NSRange(location: r.location, length: min(r.length, len - r.location))
    }

    func recolor(_ r: NSRange, in ts: NSTextStorage) {
        let r = clamp(r)
        guard r.length > 0 else { return }
        let split = min(max(readEnd, r.location), r.location + r.length)
        if split > r.location { ts.addAttribute(.foregroundColor, value: readColor, range: NSRange(location: r.location, length: split - r.location)) }
        if r.location + r.length > split { ts.addAttribute(.foregroundColor, value: unreadColor, range: NSRange(location: split, length: r.location + r.length - split)) }
    }

    func applyHighlight(word: NSRange, sentence: NSRange) {
        guard let ts = textView.textStorage, word != curWord || sentence != curSentence else { return }
        ts.beginEditing()
        if curWord.location != NSNotFound { ts.removeAttribute(.backgroundColor, range: clamp(curWord)) }

        let newReadEnd = min(sentence.location, ns.length)
        if newReadEnd > readEnd {
            ts.addAttribute(.foregroundColor, value: readColor, range: NSRange(location: readEnd, length: newReadEnd - readEnd))
        } else if newReadEnd < readEnd {
            ts.addAttribute(.foregroundColor, value: unreadColor, range: NSRange(location: newReadEnd, length: readEnd - newReadEnd))
        }
        readEnd = newReadEnd
        if curSentence.location != NSNotFound && curSentence != sentence { recolor(curSentence, in: ts) }

        let s = clamp(sentence)
        if s.length > 0 { ts.addAttribute(.foregroundColor, value: currentColor, range: s) }
        let w = clamp(word)
        if w.length > 0 { ts.addAttribute(.backgroundColor, value: wordBG, range: w) }
        ts.endEditing()
        // Pills are drawn slightly larger than the glyphs; repaint so no edges are left behind.
        textView.setNeedsDisplay(textView.visibleRect)
        curWord = word
        curSentence = sentence
    }

    func scrollToShow(_ r: NSRange, force: Bool = false) {
        guard force || Date().timeIntervalSince(scroll.lastUserScroll) > 4,
              let lm = textView.layoutManager, let tc = textView.textContainer else { return }
        let g = lm.glyphRange(forCharacterRange: clamp(r), actualCharacterRange: nil)
        var rect = lm.boundingRect(forGlyphRange: g, in: tc)
        rect.origin.y += textView.textContainerOrigin.y
        let clip = scroll.contentView
        let vis = clip.bounds
        guard force || rect.minY < vis.minY + 12 || rect.maxY > vis.maxY - vis.height * 0.25 else { return }
        let maxY = max(0, textView.frame.height - vis.height)
        let y = min(max(0, rect.minY - vis.height * 0.3), maxY)
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.35
            ctx.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
            clip.animator().setBoundsOrigin(NSPoint(x: 0, y: y))
        }
        scroll.reflectScrolledClipView(clip)
    }

    // MARK: Actions

    func seek(toTextLocation loc: Int) {
        pendingSeek = nil
        if loc < genStartLoc {
            restartGeneration(from: sentences[sentenceIndex(for: loc)].location)
            return
        }
        for (c, ch) in chunks.enumerated() {
            if ch.textEnd <= loc && c < chunks.count - 1 { continue }
            guard let i = ch.words.firstIndex(where: { $0.loc + max($0.len, 1) > loc }) else { continue }
            finishWork?.cancel()
            finished = false
            let t = max(0, ch.words[i].start - 0.06)
            if let item = player.currentItem, itemIndex[ObjectIdentifier(item)] == c {
                player.seek(to: CMTime(seconds: t, preferredTimescale: 1000), toleranceBefore: .zero, toleranceAfter: .zero)
            } else {
                enqueue(from: c, at: t)
            }
            wantsPlay = true
            player.playImmediately(atRate: speed)
            scroll.lastUserScroll = .distantPast
            let w = ch.words[i]
            scrollToShow(NSRange(location: w.loc, length: max(w.len, 1)))
            updateStatus()
            return
        }
        // That part hasn't been turned into audio yet: remember it and jump when it's ready.
        if !genDone && loc < ns.length {
            pendingSeek = loc
            flash("Loading…")
        }
    }

    func clickedText(at index: Int) {
        guard started || genStartLoc > 0 else { return }
        seek(toTextLocation: index)
    }

    func seekFraction(_ f: CGFloat) {
        guard started || genStartLoc > 0 else { return }
        seek(toTextLocation: Int(f * CGFloat(ns.length)))
    }

    @objc func prevSentence() { skipSentence(-1) }
    @objc func nextSentence() { skipSentence(1) }

    func skipSentence(_ dir: Int) {
        guard started else { return }
        let s = sentenceIndex(for: curWordLoc)
        let target: Int
        if dir < 0 {
            target = (curWordLoc - sentences[s].location > 15 && !finished) ? s : max(0, s - 1)
        } else {
            target = s + 1
            guard target < sentences.count else { return }
        }
        seek(toTextLocation: sentences[target].location)
    }

    @objc func togglePause() {
        guard started else { return }
        if finished { readFromStart(); return }
        wantsPlay.toggle()
        if wantsPlay { player.playImmediately(atRate: speed) } else { player.pause() }
        updateStatus()
    }

    func setSpeed(_ s: Float) {
        speed = s
        UserDefaults.standard.set(speed, forKey: "speed")
        player.defaultRate = speed
        if wantsPlay && player.rate != 0 { player.rate = speed }
        updateSpeedButton()
    }

    @objc func cycleSpeed() {
        let i = kSpeeds.firstIndex(of: speed) ?? 0
        setSpeed(kSpeeds[(i + 1) % kSpeeds.count])
    }
}

// MARK: - Run

private var activeController: Controller?
private var termSource: DispatchSourceSignal?

/// Shows the reader window and runs until it's closed (then the process exits).
func runReader(textPath: String, voice: String, rate: String, tableHeaders: Bool = true, deleteInput: Bool) {
    let app = NSApplication.shared
    app.setActivationPolicy(.accessory)
    let controller = Controller(textPath: textPath, voice: voice, rate: rate, tableHeaders: tableHeaders,
                                deleteInput: deleteInput)
    activeController = controller
    // "Stop Speaking" sends SIGTERM: fade out and clean up instead of dying mid-sentence.
    signal(SIGTERM, SIG_IGN)
    let source = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
    source.setEventHandler { controller.close() }
    source.resume()
    termSource = source
    controller.start()
    app.run()
}
