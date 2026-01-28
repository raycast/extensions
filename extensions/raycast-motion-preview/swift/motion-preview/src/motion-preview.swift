import Cocoa
import RaycastSwiftMacros
import SwiftUI
import WebKit

class FloatingWindow: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: FloatingWindow!
    var initialFileContent: (data: Data, path: String)?
    var eventMonitor: Any?

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        print("Application did finish launching")
        
        // Create the SwiftUI view that provides the window contents.
        let contentView = ContentView(initialFileContent: initialFileContent) {
            NSApplication.shared.terminate(nil)
        }

        // Calculate the window size to cover the entire screen
        guard let screen = NSScreen.main else { return }
        let windowFrame = screen.frame

        // Create the window and set the content view.
        window = FloatingWindow(
            contentRect: windowFrame,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered, defer: false)
        window.level = .floating
        window.backgroundColor = .clear
        window.isOpaque = false
        window.hasShadow = false
        window.contentView = NSHostingView(rootView: contentView)
        window.delegate = self
        
        print("Window created")

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        
        // Set up a local event monitor for the Escape key
        eventMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown]) { event in
            if event.keyCode == 53 { // 53 is the key code for Escape
                self.terminateApp()
                return nil
            }
            return event
        }
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        window.makeKeyAndOrderFront(nil)
    }

    func applicationWillTerminate(_ aNotification: Notification) {
        if let eventMonitor = eventMonitor {
            NSEvent.removeMonitor(eventMonitor)
        }
    }

    func windowWillClose(_ notification: Notification) {
        terminateApp()
    }

    func terminateApp() {
        if let eventMonitor = eventMonitor {
            NSEvent.removeMonitor(eventMonitor)
        }
        NSApplication.shared.terminate(nil)
    }
}

struct WebView: NSViewRepresentable {
    var fileContent: Data
    var fileExtension: String

    func makeNSView(context: Context) -> WKWebView {
        let webView = WKWebView()
        loadHTMLContent(into: webView)
        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        loadHTMLContent(into: nsView)
    }

    private func loadHTMLContent(into webView: WKWebView) {
        let htmlContent = getHTMLContent()
        webView.loadHTMLString(htmlContent, baseURL: nil)
    }

    private func getHTMLContent() -> String {
        let base64Data = fileContent.base64EncodedString()
        
        guard let executablePath = Bundle.main.executablePath else {
            fatalError("Unable to determine executable path")
        }
        
        let executableURL = URL(fileURLWithPath: executablePath)
        let parentDirectoryURL = executableURL.deletingLastPathComponent().deletingLastPathComponent()
        
        let htmlFileName: String
        let dataType: String
        
        switch fileExtension.lowercased() {
        case "riv":
            htmlFileName = "preview_rive.html"
            dataType = "arraybuffer"
        case "json":
            htmlFileName = "preview_lottie.html"
            dataType = "json"
        case "lottie":
            htmlFileName = "preview_lottie.html"
            dataType = "lottie"
        default:
            fatalError("Unsupported file type: \(fileExtension)")
        }
        
        let htmlFileURL = parentDirectoryURL.appendingPathComponent(htmlFileName)
        
        do {
            var htmlContent = try String(contentsOf: htmlFileURL, encoding: .utf8)
            
            // Replace placeholders in the HTML template
            htmlContent = htmlContent.replacingOccurrences(of: "{{BASE64_DATA}}", with: base64Data)
            htmlContent = htmlContent.replacingOccurrences(of: "{{DATA_TYPE}}", with: dataType)
            
            return htmlContent
        } catch {
            fatalError("Error reading HTML file: \(error). Looked for file at: \(htmlFileURL.path)")
        }
    }
}

struct ContentView: View {
    let fileContent: Data
    let fileExtension: String
    let closeAction: () -> Void

    init(initialFileContent: (data: Data, path: String)?, closeAction: @escaping () -> Void) {
        self.fileContent = initialFileContent?.data ?? Data()
        self.fileExtension = (initialFileContent?.path as NSString?)?.pathExtension ?? ""
        self.closeAction = closeAction
    }

    var body: some View {
        ZStack {
            Color.black.opacity(0.5)
                .edgesIgnoringSafeArea(.all)
                .onTapGesture {
                    closeAction()
                }
            
            WebView(fileContent: fileContent, fileExtension: fileExtension)
                .frame(width: 550, height: 550)
                .background(Color.white)
                .cornerRadius(20)
                .shadow(radius: 10)
        }
        .edgesIgnoringSafeArea(.all)
    }
}

@raycast func previewFile(filePath: String) {
    guard !filePath.isEmpty else {
        return
    }

    let delegate = AppDelegate()
    
    if let fileContent = try? Data(contentsOf: URL(fileURLWithPath: filePath)) {
        delegate.initialFileContent = (fileContent, filePath)
    } else {
        return  // Exit if file loading fails
    }
    
    let app = NSApplication.shared
    app.delegate = delegate
    
    // Activate the app but don't show it in the dock
    app.setActivationPolicy(.accessory)
    app.activate(ignoringOtherApps: true)
    
    app.run()
}