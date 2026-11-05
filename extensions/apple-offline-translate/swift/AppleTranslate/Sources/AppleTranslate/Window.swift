import AppKit
import SwiftUI
import Translation
import RaycastSwiftMacros

@MainActor final class TranslatorModel: ObservableObject {
    @Published var input = NSAttributedString(string: "")
    @Published var output = NSAttributedString(string: "")
    @Published var result: TranslationOutput?
    @Published var languages: [(id: String, name: String)] = []
    @Published var paired = UserDefaults.standard.object(forKey: "paired") as? Bool ?? true
    @Published var source = UserDefaults.standard.string(forKey: "source") ?? "auto"
    @Published var target = UserDefaults.standard.string(forKey: "target") ?? "ru"
    @Published var busy = false
    @Published var error = ""
    @Published var copied = false
    @Published var expanded = false
    private var task: Task<Void, Never>?
    weak var window: NSWindow?
    var onPaste: ((String) -> Void)?

    func start() {
        Task {
            let available = await LanguageAvailability(preferredStrategy: .highFidelity).supportedLanguages
            languages = available.map { ($0.minimalIdentifier, Locale(identifier: "en").localizedString(forIdentifier: $0.minimalIdentifier) ?? $0.minimalIdentifier) }.sorted { $0.name < $1.name }
            if !languages.contains(where: { $0.id == target }) { target = languages.contains(where: { $0.id == "ru" }) ? "ru" : (languages.first?.id ?? "en") }
            if source != "auto" && !languages.contains(where: { $0.id == source }) { source = "auto" }
            schedule()
        }
    }

    func schedule() {
        task?.cancel()
        result = nil
        output = NSAttributedString(string: "")
        error = ""
        copied = false
        busy = false
        UserDefaults.standard.set(paired, forKey: "paired")
        UserDefaults.standard.set(source, forKey: "source")
        UserDefaults.standard.set(target, forKey: "target")
        guard !input.string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        guard input.length <= 20_000 else { error = "Use at most 20,000 characters per translation."; return }
        busy = true
        let text = NSAttributedString(attributedString: input)
        let from = source, to = target, pair = paired
        task = Task {
            do {
                try await Task.sleep(for: .milliseconds(400))
                let translated = try await TranslationEngine.translate(text, source: from, target: to, paired: pair)
                try Task.checkCancellation()
                result = translated
                output = translated.content
                busy = false
            } catch {
                if !Task.isCancelled { self.error = error.localizedDescription; busy = false }
            }
        }
    }

    func name(_ id: String) -> String {
        languages.first { $0.id == id }?.name ?? id
    }

    func swap() {
        guard let result else { return }
        input = result.content
        if !paired { source = result.targetLanguage; target = result.sourceLanguage }
        schedule()
    }

    func copy() {
        guard let result else { return }
        let item = NSPasteboardItem()
        item.setString(result.content.string, forType: .string)
        if let rtf = try? result.content.data(from: NSRange(location: 0, length: result.content.length), documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf]) { item.setData(rtf, forType: .rtf) }
        if let html = try? result.content.data(from: NSRange(location: 0, length: result.content.length), documentAttributes: [.documentType: NSAttributedString.DocumentType.html]) { item.setData(html, forType: .html) }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.writeObjects([item])
        copied = true
    }

    func pasteToApp() {
        guard let result else { return }
        var reply: [String: Any] = ["action": "paste", "text": result.content.string]
        if let html = try? result.content.data(from: NSRange(location: 0, length: result.content.length), documentAttributes: [.documentType: NSAttributedString.DocumentType.html]), let string = String(data: html, encoding: .utf8) { reply["html"] = string }
        onPaste?(encodedResponse(reply))
        window?.close()
    }

    func expand() {
        guard let window, let screen = window.screen else { return }
        expanded.toggle()
        let size = NSSize(width: min(expanded ? 1280 : 920, screen.visibleFrame.width - 60), height: min(expanded ? 820 : 540, screen.visibleFrame.height - 60))
        window.setContentSize(size)
        window.center()
    }
}

struct RichText: NSViewRepresentable {
    @Binding var value: NSAttributedString
    var editable: Bool
    var changed: () -> Void = {}

    class Coordinator: NSObject, NSTextViewDelegate {
        var parent: RichText
        var lastValue: NSAttributedString?
        init(_ parent: RichText) { self.parent = parent }
        func textDidChange(_ notification: Notification) {
            guard let view = notification.object as? NSTextView else { return }
            let updated = NSAttributedString(attributedString: view.attributedString())
            lastValue = updated
            parent.value = updated
            parent.changed()
        }
    }
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeNSView(context: Context) -> NSScrollView {
        let scroll = NSScrollView()
        scroll.hasVerticalScroller = true
        scroll.autohidesScrollers = true
        scroll.drawsBackground = false
        let view = NSTextView(frame: .zero)
        view.isRichText = true
        view.importsGraphics = false
        view.isEditable = editable
        view.isSelectable = true
        view.drawsBackground = false
        view.isVerticallyResizable = true
        view.isHorizontallyResizable = false
        view.autoresizingMask = [.width]
        view.textContainer?.widthTracksTextView = true
        view.textContainer?.containerSize = NSSize(width: 0, height: CGFloat.greatestFiniteMagnitude)
        view.textContainerInset = NSSize(width: 18, height: 16)
        view.minSize = .zero
        view.maxSize = NSSize(width: CGFloat.greatestFiniteMagnitude, height: CGFloat.greatestFiniteMagnitude)
        view.font = .systemFont(ofSize: 18)
        view.textColor = .labelColor
        view.insertionPointColor = .labelColor
        view.allowsUndo = editable
        view.isAutomaticQuoteSubstitutionEnabled = false
        view.isAutomaticDashSubstitutionEnabled = false
        view.isAutomaticTextReplacementEnabled = false
        view.isAutomaticLinkDetectionEnabled = false
        view.setAccessibilityLabel(editable ? "Source text" : "Translation")
        view.delegate = context.coordinator
        scroll.documentView = view
        if editable { DispatchQueue.main.async { view.window?.makeFirstResponder(view) } }
        return scroll
    }
    func updateNSView(_ scroll: NSScrollView, context: Context) {
        context.coordinator.parent = self
        guard let view = scroll.documentView as? NSTextView else { return }
        if context.coordinator.lastValue?.isEqual(to: value) != true {
            let selection = view.selectedRange()
            let display = NSMutableAttributedString(attributedString: value)
            let range = NSRange(location: 0, length: display.length)
            display.addAttribute(.foregroundColor, value: NSColor.labelColor, range: range)
            value.enumerateAttribute(.font, in: range) { font, range, _ in
                if font == nil { display.addAttribute(.font, value: NSFont.systemFont(ofSize: 18), range: range) }
            }
            view.textStorage?.setAttributedString(display)
            context.coordinator.lastValue = NSAttributedString(attributedString: value)
            let position = min(selection.location, value.length)
            view.setSelectedRange(NSRange(location: position, length: min(selection.length, value.length - position)))
            if !editable { view.scrollToBeginningOfDocument(nil) }
        }
        let style = NSMutableParagraphStyle()
        style.lineSpacing = 5
        view.typingAttributes = [.font: NSFont.systemFont(ofSize: 18), .foregroundColor: NSColor.labelColor, .paragraphStyle: style]
    }
}

struct TranslatorView: View {
    @ObservedObject var model: TranslatorModel
    private let secondary = Color.white.opacity(0.48)
    var body: some View {
        VStack(spacing: 20) {
            HStack(spacing: 10) {
                Image(systemName: "character.bubble.fill").font(.system(size: 18)).foregroundStyle(.white.opacity(0.8))
                Text("Apple Translate").font(.system(size: 15, weight: .semibold))
                HStack(spacing: 5) { Circle().fill(Color.green.opacity(0.8)).frame(width: 5, height: 5); Text("ON DEVICE").font(.system(size: 9, weight: .bold, design: .rounded)).tracking(1) }.foregroundStyle(secondary)
                Spacer()
                Picker("Mode", selection: $model.paired) {
                    Text("RU ↔ EN · Auto").tag(true)
                    Text("Other Languages").tag(false)
                }.labelsHidden().frame(width: 175).accessibilityLabel("Translation mode")
                Button { model.expand() } label: { Image(systemName: model.expanded ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right").frame(width: 28, height: 24) }
                    .buttonStyle(.plain).foregroundStyle(secondary).help("Expand Window · ⇧⌘F").keyboardShortcut("f", modifiers: [.command, .shift]).accessibilityLabel("Expand window")
            }.padding(.top, 10)
            HStack(spacing: 0) {
                panel(source: true)
                VStack(spacing: 8) {
                    Rectangle().fill(Color.white.opacity(0.09)).frame(width: 1)
                    Button { model.swap() } label: { Image(systemName: "arrow.left.arrow.right").font(.system(size: 14, weight: .medium)).frame(width: 30, height: 30) }
                        .buttonStyle(.plain).disabled(model.result == nil).foregroundStyle(secondary).help("Swap Languages · ⌘S").keyboardShortcut("s", modifiers: .command).accessibilityLabel("Swap languages")
                    Rectangle().fill(Color.white.opacity(0.09)).frame(width: 1)
                }.frame(width: 32).padding(.vertical, 20)
                panel(source: false)
            }
            .background(Color.white.opacity(0.055), in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Color.white.opacity(0.07)))
            HStack(spacing: 12) {
                if !model.error.isEmpty {
                    Image(systemName: "exclamationmark.circle").foregroundStyle(.orange)
                    Text(model.error).font(.system(size: 12)).foregroundStyle(.orange).lineLimit(3).textSelection(.enabled)
                } else if model.busy {
                    ProgressView().controlSize(.small)
                    Text("Translating on Your Mac…").font(.system(size: 12)).foregroundStyle(secondary)
                } else {
                    Text(model.input.length == 0 ? "Paste text to detect the language automatically" : "\(model.input.string.count) characters · Formatting preserved").font(.system(size: 12)).foregroundStyle(secondary)
                }
                Spacer(minLength: 10)
                Button { model.pasteToApp() } label: { Label("Paste", systemImage: "arrow.up.forward.app").padding(.horizontal, 6).padding(.vertical, 3) }
                    .disabled(model.result == nil).keyboardShortcut(.return, modifiers: [.command, .option]).help("Paste to Active App · ⌥⌘↵")
                Button { model.copy() } label: { Label(model.copied ? "Copied" : "Copy", systemImage: model.copied ? "checkmark" : "doc.on.doc").padding(.horizontal, 6).padding(.vertical, 3) }
                    .disabled(model.result == nil).keyboardShortcut(.return, modifiers: .command)
            }.buttonStyle(.bordered).controlSize(.large)
        }
        .padding(22)
        .background(.ultraThinMaterial)
        .preferredColorScheme(.dark)
        .onChange(of: model.paired) { model.schedule() }
        .onChange(of: model.source) { model.schedule() }
        .onChange(of: model.target) { model.schedule() }
    }

    func panel(source: Bool) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(source ? "SOURCE" : "TRANSLATION").font(.system(size: 10, weight: .semibold)).tracking(1.3).foregroundStyle(secondary)
                Spacer()
                if source && model.input.length > 0 {
                    Button { model.input = NSAttributedString(string: ""); model.schedule() } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(secondary) }.buttonStyle(.plain).help("Clear").accessibilityLabel("Clear text")
                }
            }.padding(.horizontal, 22).padding(.top, 19).padding(.bottom, 2)
            ZStack(alignment: .topLeading) {
                RichText(value: source ? $model.input : $model.output, editable: source, changed: { model.schedule() })
                if (source ? model.input : model.output).length == 0 {
                    Text(source ? "Type or paste text…" : model.busy ? "" : "Your translation will appear here")
                        .font(.system(size: 18)).foregroundStyle(.white.opacity(0.23)).padding(.horizontal, 23).padding(.top, 17).allowsHitTesting(false)
                }
            }
            HStack {
                if model.paired {
                    Text(source ? (model.result.map { model.name($0.sourceLanguage) } ?? "Russian or English") : (model.result.map { model.name($0.targetLanguage) } ?? "English or Russian"))
                        .font(.system(size: 12, weight: .medium)).padding(.horizontal, 10).padding(.vertical, 5).background(.white.opacity(0.065), in: RoundedRectangle(cornerRadius: 7))
                    if source { Text("AUTO").font(.system(size: 9, weight: .medium)).foregroundStyle(secondary) }
                } else {
                    Picker(source ? "Source language" : "Target language", selection: source ? $model.source : $model.target) {
                        if source { Text("Detect Language").tag("auto") }
                        ForEach(model.languages, id: \.id) { language in Text(language.name).tag(language.id) }
                    }.labelsHidden().frame(maxWidth: 215)
                }
                Spacer()
                if !source { Image(systemName: "lock.shield").font(.system(size: 12)).foregroundStyle(secondary).help("Text is processed on this Mac") }
            }.padding(.horizontal, 22).padding(.bottom, 17).padding(.top, 8)
        }.frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

@MainActor final class WindowDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    let model = TranslatorModel()
    var window: NSWindow?
    var reply = ""
    var closed = false
    func present() {
        let input = FileHandle.standardInput.readDataToEndOfFile()
        if input.count <= 3_000_000, let request = try? JSONDecoder().decode(Startup.self, from: input) {
            model.input = NSAttributedString(string: request.text, attributes: [.font: NSFont.systemFont(ofSize: 18), .foregroundColor: NSColor.labelColor])
            if let encoded = request.rtf, let data = Data(base64Encoded: encoded), let rich = try? NSAttributedString(data: data, options: [.documentType: NSAttributedString.DocumentType.rtf], documentAttributes: nil), rich.string == request.text { model.input = rich }
            if let paired = request.paired { model.paired = paired }
            if let source = request.source { model.source = source }
            if let target = request.target { model.target = target }
        }
        let menu = NSMenu()
        let appItem = NSMenuItem(); let appMenu = NSMenu()
        let quit = appMenu.addItem(withTitle: "Quit Apple Translate", action: #selector(closeWindow), keyEquivalent: "q")
        quit.target = self
        appItem.submenu = appMenu; menu.addItem(appItem)
        let editItem = NSMenuItem(title: "Edit", action: nil, keyEquivalent: ""); let editMenu = NSMenu(title: "Edit")
        for (title, action, key) in [("Undo", "undo:", "z"), ("Cut", "cut:", "x"), ("Copy", "copy:", "c"), ("Paste", "paste:", "v"), ("Select All", "selectAll:", "a")] { editMenu.addItem(withTitle: title, action: Selector(action), keyEquivalent: key) }
        editItem.submenu = editMenu; menu.addItem(editItem); NSApp.mainMenu = menu
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 920, height: 540), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Apple Translate"
        window.titlebarAppearsTransparent = true
        window.backgroundColor = NSColor(calibratedWhite: 0.075, alpha: 1)
        window.appearance = NSAppearance(named: .darkAqua)
        window.minSize = NSSize(width: 780, height: 400)
        window.contentView = NSHostingView(rootView: TranslatorView(model: model))
        window.delegate = self
        window.isReleasedWhenClosed = false
        window.center()
        self.window = window
        model.window = window
        model.onPaste = { [weak self] reply in self?.reply = reply }
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        model.start()
    }
    @objc func closeWindow() { window?.close() }
    func windowWillClose(_ notification: Notification) { closed = true }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
}

struct Startup: Decodable { let text: String; let rtf: String?; let paired: Bool?; let source: String?; let target: String? }
@raycast @MainActor func showWindow() async -> String {
    let app = NSApplication.shared
    app.setActivationPolicy(.regular)
    let delegate = WindowDelegate()
    app.delegate = delegate
    app.finishLaunching()
    delegate.present()
    // Yield between AppKit events so translation tasks can update the window on MainActor.
    while !delegate.closed {
        autoreleasepool {
            if let event = app.nextEvent(matching: .any, until: Date(timeIntervalSinceNow: 0.01), inMode: .default, dequeue: true) {
                app.sendEvent(event)
            }
            app.updateWindows()
        }
        try? await Task.sleep(for: .milliseconds(10))
    }
    return delegate.reply
}
