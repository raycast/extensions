import Cocoa
import RaycastSwiftMacros
import WebKit

// MARK: - Model

// A motion file format the previewer can render, along with the data marker and MIME type it needs.
private enum MotionFileType {
    case rive
    case lottieJSON
    case dotLottie

    init?(fileExtension: String) {
        switch fileExtension.lowercased() {
        case "riv": self = .rive
        case "json": self = .lottieJSON
        case "lottie": self = .dotLottie
        default: return nil
        }
    }

    // The marker the page reads to pick a renderer and how to fetch the payload.
    var dataType: String {
        switch self {
        case .rive: "arraybuffer"
        case .lottieJSON: "json"
        case .dotLottie: "lottie"
        }
    }

    var dataMimeType: String {
        switch self {
        case .lottieJSON: "application/json"
        case .rive, .dotLottie: "application/octet-stream"
        }
    }
}

// The folder's previewable files plus which one is selected. The page reads this as a manifest and fetches each file's
// bytes by index; arrow keys and thumbnail clicks just move `current` on the page, never reloading the window.
private final class PreviewLibrary {
    private(set) var files: [URL]
    private(set) var current: Int

    init(selected: URL) {
        files = [selected]
        current = 0
    }

    // Replaces the single selected file with the full folder scan once it finishes (always on the main thread).
    func setFiles(_ files: [URL], current: Int) {
        self.files = files
        self.current = current
    }

    func url(at index: Int) -> URL? {
        files.indices.contains(index) ? files[index] : nil
    }
}

// MARK: - Errors

// Failures surfaced to the user; `description` keeps the Raycast bridge's stderr output human-readable.
private enum PreviewError: LocalizedError, CustomStringConvertible {
    case emptyPath
    case unsupportedType(String)
    case unreadableFile(String)
    case missingTemplate(String)
    case invalidLottie(String)

    var errorDescription: String? {
        switch self {
        case .emptyPath:
            "No file path was provided."
        case .unsupportedType(let ext):
            "Unsupported file type: .\(ext)"
        case .unreadableFile(let path):
            "Could not read file at \(path)."
        case .missingTemplate(let name):
            "Could not load preview template \(name)."
        case .invalidLottie(let reason):
            "Invalid Lottie JSON file (\(reason))."
        }
    }

    var description: String { errorDescription ?? "Unable to preview the file." }
}

// MARK: - Lottie validation

// Validates a Lottie document's required top-level fields up front, so a bad file surfaces as a message rather than a blank window.
private enum LottieValidator {
    static func validate(_ data: Data) throws {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw PreviewError.invalidLottie("not a JSON object")
        }

        guard let version = object["v"] as? String, version.first?.isNumber == true else {
            throw PreviewError.invalidLottie(#"missing or invalid "v""#)
        }

        try requirePositive(object, "fr")
        try requireNonNegative(object, "ip")
        try requireNonNegative(object, "op")
        try requirePositiveInteger(object, "w")
        try requirePositiveInteger(object, "h")
    }

    // Reads a numeric field, rejecting JSON booleans (which also bridge to NSNumber).
    private static func number(_ object: [String: Any], _ key: String) -> Double? {
        guard let value = object[key] as? NSNumber else { return nil }
        if CFGetTypeID(value) == CFBooleanGetTypeID() { return nil }
        return value.doubleValue
    }

    private static func requirePositive(_ object: [String: Any], _ key: String) throws {
        guard let value = number(object, key), value > 0 else {
            throw PreviewError.invalidLottie("missing or invalid \"\(key)\"")
        }
    }

    private static func requireNonNegative(_ object: [String: Any], _ key: String) throws {
        guard let value = number(object, key), value >= 0 else {
            throw PreviewError.invalidLottie("missing or invalid \"\(key)\"")
        }
    }

    private static func requirePositiveInteger(_ object: [String: Any], _ key: String) throws {
        guard let value = number(object, key), value > 0, value.truncatingRemainder(dividingBy: 1) == 0 else {
            throw PreviewError.invalidLottie("missing or invalid \"\(key)\"")
        }
    }
}

// MARK: - Folder scan

// Lists the previewable files in a folder, name-sorted the way Finder shows them (numeric-aware), for the carousel.
private enum FolderScanner {
    static func supportedFiles(in folder: URL) -> [URL] {
        let contents = (try? FileManager.default.contentsOfDirectory(
            at: folder,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        )) ?? []

        return contents
            .filter { MotionFileType(fileExtension: $0.pathExtension) != nil }
            .sorted { $0.lastPathComponent.localizedStandardCompare($1.lastPathComponent) == .orderedAscending }
    }
}

// MARK: - Bundle layout

// Locates the assets directory (HTML template and the vendored `lib/` runtime), two levels above the executable.
private enum BundleLayout {
    static func assetsDirectory() throws -> URL {
        guard let executablePath = Bundle.main.executablePath else {
            throw PreviewError.missingTemplate("assets")
        }
        return URL(fileURLWithPath: executablePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
    }
}

// MARK: - HTML rendering

// Loads the single bundled template, which renders all three formats and drives the carousel from the manifest.
private enum HTMLRenderer {
    static let templateName = "preview.html"

    static func render() -> Result<String, PreviewError> {
        do {
            let url = try BundleLayout.assetsDirectory().appendingPathComponent(templateName)
            return .success(try String(contentsOf: url, encoding: .utf8))
        } catch let error as PreviewError {
            return .failure(error)
        } catch {
            return .failure(.missingTemplate(templateName))
        }
    }

    // A standalone page shown when the template can't load, so a render failure surfaces in the window instead of crashing.
    static func errorPage(_ error: PreviewError) -> String {
        let message = (error.errorDescription ?? "Unable to render preview.")
            .replacingOccurrences(of: "<", with: "&lt;")
        return """
        <!doctype html>
        <html>
          <head><meta charset="utf-8"></head>
          <body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;\
        background:#fff;font-family:-apple-system,Arial,sans-serif;color:#333;text-align:center;padding:24px;box-sizing:border-box;">
            <p>\(message)</p>
          </body>
        </html>
        """
    }
}

// MARK: - Custom scheme handler

// Serves the page, the folder manifest, each file's bytes (/data/<index>), and the vendored runtime from one in-process
// origin (motion://app/), giving the page a real origin so it can fetch payloads and load the renderer locally — fully
// offline, with no base64 inlining.
private final class PreviewSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "motion"
    static let baseURL = URL(string: "\(scheme)://app/index.html")

    private let library: PreviewLibrary
    private let libDirectory: URL

    // libDirectory is the directory that CONTAINS the `lib/` folder of downloaded runtimes
    // (cached by the Raycast command), not the bundled assets directory.
    init(library: PreviewLibrary, libDirectory: URL) {
        self.library = library
        self.libDirectory = libDirectory
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, let payload = payload(for: url) else {
            task.didFailWithError(URLError(.unsupportedURL))
            return
        }

        guard let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": payload.mimeType,
                "Content-Length": String(payload.data.count),
                "Cache-Control": "no-store",
                "Access-Control-Allow-Origin": "*",
            ]
        ) else {
            task.didFailWithError(URLError(.badServerResponse))
            return
        }

        task.didReceive(response)
        task.didReceive(payload.data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    // Maps a motion://app/<path> request to bytes: the rendered page, the folder manifest, a file's payload
    // (/data/<index>), or a cached `lib/` runtime — rejecting any path that tries to traverse out of the runtime directory.
    private func payload(for url: URL) -> (data: Data, mimeType: String)? {
        switch url.path {
        case "", "/", "/index.html":
            let html: String
            switch HTMLRenderer.render() {
            case .success(let rendered): html = rendered
            case .failure(let error): html = HTMLRenderer.errorPage(error)
            }
            return (Data(html.utf8), "text/html; charset=utf-8")

        case "/manifest":
            return (manifestData(), "application/json")

        default:
            if url.path.hasPrefix("/data/"), let index = Int(url.path.dropFirst("/data/".count)) {
                return filePayload(at: index)
            }

            let relativePath = String(url.path.drop(while: { $0 == "/" }))
            guard relativePath.hasPrefix("lib/"), !relativePath.contains("..") else { return nil }

            let fileURL = libDirectory.appendingPathComponent(relativePath)
            guard let data = try? Data(contentsOf: fileURL) else { return nil }
            return (data, Self.mimeType(forPathExtension: fileURL.pathExtension))
        }
    }

    // The carousel manifest: the selected index and, per file, its position, display name, and renderer marker.
    private func manifestData() -> Data {
        let items = library.files.enumerated().map { index, url -> [String: Any] in
            [
                "index": index,
                "name": url.lastPathComponent,
                "type": MotionFileType(fileExtension: url.pathExtension)?.dataType ?? "json",
            ]
        }
        let payload: [String: Any] = ["current": library.current, "items": items]
        return (try? JSONSerialization.data(withJSONObject: payload)) ?? Data(#"{"current":0,"items":[]}"#.utf8)
    }

    private func filePayload(at index: Int) -> (data: Data, mimeType: String)? {
        guard let fileURL = library.url(at: index),
              let type = MotionFileType(fileExtension: fileURL.pathExtension),
              let data = try? Data(contentsOf: fileURL) else { return nil }
        return (data, type.dataMimeType)
    }

    private static func mimeType(forPathExtension ext: String) -> String {
        switch ext.lowercased() {
        case "js": "text/javascript"
        case "wasm": "application/wasm"
        case "json": "application/json"
        default: "application/octet-stream"
        }
    }
}

// MARK: - Window & app lifecycle

// A borderless floating panel that can still become key, so it receives the Escape and arrow keys.
private final class PreviewWindow: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

// Builds and shows the floating preview window, scans the selected file's folder for siblings to populate the carousel,
// and tears the app down on close, a backdrop click, or Escape (key code 53).
private final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler {
    private let selectedURL: URL
    private let libDirectory: URL
    private let library: PreviewLibrary
    private var window: PreviewWindow?
    private var webView: WKWebView?
    private var keyMonitor: Any?

    init(selectedURL: URL, libDirectory: URL) {
        self.selectedURL = selectedURL
        self.libDirectory = libDirectory
        self.library = PreviewLibrary(selected: selectedURL)
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let webView = makeWebView()
        self.webView = webView

        let frame = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 800, height: 600)
        let window = PreviewWindow(
            contentRect: frame,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        window.level = .floating
        window.backgroundColor = .clear
        window.isOpaque = false
        window.hasShadow = false
        // The page paints the full-screen dim backdrop, the centered card, and the bottom carousel; the web view is
        // transparent so the backdrop composites over the desktop.
        webView.frame = frame
        webView.autoresizingMask = [.width, .height]
        window.contentView = webView
        window.delegate = self
        self.window = window

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        scanFolder()

        // Escape (53) closes; the arrow keys (Left 123, Right 124, Down 125, Up 126) step the carousel inside the page.
        keyMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown]) { [weak self] event in
            guard let self else { return event }
            switch event.keyCode {
            case 53:
                self.terminate()
                return nil
            case 123, 126:
                self.navigate(by: -1)
                return nil
            case 124, 125:
                self.navigate(by: 1)
                return nil
            default:
                return event
            }
        }
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        window?.makeKeyAndOrderFront(nil)
    }

    func windowWillClose(_ notification: Notification) {
        terminate()
    }

    private func makeWebView() -> WKWebView {
        let configuration = WKWebViewConfiguration()
        // The page posts here when the dim backdrop is clicked, so click-outside-to-dismiss still works.
        configuration.userContentController.add(self, name: "close")

        let handler = PreviewSchemeHandler(library: library, libDirectory: libDirectory)
        configuration.setURLSchemeHandler(handler, forURLScheme: PreviewSchemeHandler.scheme)

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.setValue(false, forKey: "drawsBackground")
        if let baseURL = PreviewSchemeHandler.baseURL {
            webView.load(URLRequest(url: baseURL))
        }
        return webView
    }

    // The page's only message is a request to dismiss (a click on the dim backdrop).
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        terminate()
    }

    // Scans the folder off the main thread, then (only when there are siblings) hands the full list to the page so the
    // carousel appears a beat after the stage — no blocking on slow or networked folders.
    private func scanFolder() {
        let folder = selectedURL.deletingLastPathComponent()
        let selected = selectedURL
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            var files = FolderScanner.supportedFiles(in: folder)
            if !files.contains(where: { $0.lastPathComponent == selected.lastPathComponent }) {
                files.insert(selected, at: 0)
            }
            let current = files.firstIndex { $0.lastPathComponent == selected.lastPathComponent } ?? 0
            guard files.count > 1 else { return }

            DispatchQueue.main.async {
                guard let self else { return }
                self.library.setFiles(files, current: current)
                self.webView?.evaluateJavaScript("window.__motionRefresh && window.__motionRefresh()")
            }
        }
    }

    // Steps the carousel in the page; it owns the current index and clamps at the ends.
    private func navigate(by delta: Int) {
        webView?.evaluateJavaScript("window.__motionNav && window.__motionNav(\(delta))")
    }

    private func terminate() {
        if let keyMonitor {
            NSEvent.removeMonitor(keyMonitor)
            self.keyMonitor = nil
        }
        NSApplication.shared.terminate(nil)
    }
}

// MARK: - Raycast entry point

// Validates the path and file type, reads the bytes, validates Lottie JSON up front, then runs the accessory app (no Dock icon) that shows the window.
@raycast func previewFile(filePath: String, libDirectory: String) throws {
    guard !filePath.isEmpty else {
        throw PreviewError.emptyPath
    }

    let fileExtension = (filePath as NSString).pathExtension
    guard let fileType = MotionFileType(fileExtension: fileExtension) else {
        throw PreviewError.unsupportedType(fileExtension)
    }

    let url = URL(fileURLWithPath: filePath)
    guard let data = try? Data(contentsOf: url) else {
        throw PreviewError.unreadableFile(filePath)
    }

    if case .lottieJSON = fileType {
        try LottieValidator.validate(data)
    }

    let delegate = AppDelegate(selectedURL: url, libDirectory: URL(fileURLWithPath: libDirectory))

    let app = NSApplication.shared
    app.delegate = delegate
    app.setActivationPolicy(.accessory)
    app.activate(ignoringOtherApps: true)
    app.run()
}
