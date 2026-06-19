import AppKit
import RaycastSwiftMacros
import UniformTypeIdentifiers
import WebKit

class ViewerDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    let htmlPath: String

    init(htmlPath: String) {
        self.htmlPath = htmlPath
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        setupMenu()

        let config = WKWebViewConfiguration()
        let userContent = config.userContentController
        userContent.add(self, name: "copyImage")
        userContent.add(self, name: "saveImage")
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1200, height: 800)
        let w = min(screen.width * 0.85, 1400.0)
        let h = min(screen.height * 0.85, 900.0)
        let frame = NSRect(x: screen.midX - w / 2, y: screen.midY - h / 2, width: w, height: h)

        window = NSWindow(
            contentRect: frame,
            styleMask: [.titled, .closable, .resizable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Simple Draw"
        window.titlebarAppearsTransparent = true
        window.backgroundColor = NSColor(red: 0.1, green: 0.1, blue: 0.1, alpha: 1)

        webView = WKWebView(frame: window.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.setValue(false, forKey: "drawsBackground")
        window.contentView?.addSubview(webView)

        let url = URL(fileURLWithPath: htmlPath)
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func setupMenu() {
        let mainMenu = NSMenu()
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)
        let appMenu = NSMenu()
        appMenu.addItem(NSMenuItem(title: "Quit Simple Draw", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        appMenuItem.submenu = appMenu
        NSApp.mainMenu = mainMenu
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? String,
              let commaIndex = body.firstIndex(of: ",") else { return }

        let base64 = String(body[body.index(after: commaIndex)...])
        guard let data = Data(base64Encoded: base64) else { return }

        switch message.name {
        case "copyImage":
            let pb = NSPasteboard.general
            pb.clearContents()
            let copied = pb.setData(data, forType: .png)
            DispatchQueue.main.async {
                self.webView.evaluateJavaScript("window._onCopyResult(\(copied))", completionHandler: nil)
            }

        case "saveImage":
            let panel = NSSavePanel()
            panel.nameFieldStringValue = "simple-draw-\(Int(Date().timeIntervalSince1970)).png"
            panel.allowedContentTypes = [.png]
            panel.begin { result in
                if result == .OK, let url = panel.url {
                    let saved = (try? data.write(to: url)) != nil
                    DispatchQueue.main.async {
                        self.webView.evaluateJavaScript("window._onSaveResult(\(saved))", completionHandler: nil)
                    }
                }
            }

        default:
            break
        }
    }
}

@raycast func readClipboardImage() -> String? {
    let pb = NSPasteboard.general

    if let data = pb.data(forType: .png) {
        return data.base64EncodedString()
    }

    if let data = pb.data(forType: .tiff),
       let bitmap = NSBitmapImageRep(data: data),
       let pngData = bitmap.representation(using: .png, properties: [:]) {
        return pngData.base64EncodedString()
    }

    return nil
}

@raycast func openViewer(htmlPath: String) -> Bool {
    let app = NSApplication.shared
    app.setActivationPolicy(.regular)

    let delegate = ViewerDelegate(htmlPath: htmlPath)
    app.delegate = delegate
    app.run()

    return true
}
