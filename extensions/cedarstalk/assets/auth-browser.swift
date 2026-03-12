import Cocoa
import WebKit

let TARGET_HOST = "selfservice.cedarville.edu"
let AUTH_COOKIES: Set<String> = [".ASPXAUTH", "studentselfservice_live"]

class AuthBrowser: NSObject, NSApplicationDelegate, WKNavigationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    let signInUrl: URL
    let cookieOutputFile: String
    var didComplete = false

    init(url: URL, cookieOutputFile: String) {
        self.signInUrl = url
        self.cookieOutputFile = cookieOutputFile
    }

    func applicationDidFinishLaunching(_: Notification) {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent() // fully isolated, no shared cookies

        let rect = NSRect(x: 0, y: 0, width: 520, height: 700)
        webView = WKWebView(frame: rect, configuration: config)
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]

        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .resizable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "CedarStalk — Sign In"
        window.contentView = webView
        window.delegate = self
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        webView.load(URLRequest(url: signInUrl))
    }

    func webView(_ webView: WKWebView, didFinish _: WKNavigation!) {
        guard !didComplete,
              let host = webView.url?.host,
              host.contains(TARGET_HOST)
        else { return }

        webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { [weak self] all in
            guard let self, !self.didComplete else { return }
            let site = all.filter { $0.domain.contains(TARGET_HOST) }
            guard site.contains(where: { AUTH_COOKIES.contains($0.name) }) else { return }

            self.didComplete = true
            let cookieStr = site.map { "\($0.name)=\($0.value)" }.joined(separator: "; ")
            try? cookieStr.write(toFile: self.cookieOutputFile, atomically: true, encoding: .utf8)
            NSApp.terminate(nil)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_: NSApplication) -> Bool { true }

    func windowWillClose(_: Notification) {
        if !didComplete { exit(1) }
    }
}

// Filter out ALL system-injected flags (-psn_XXX, -AppleLanguages, etc.)
// Our args are positional: URL (starts with https) and file path (starts with /)
let args = CommandLine.arguments.dropFirst().filter { !$0.hasPrefix("-") }

guard args.count >= 2,
      let url = URL(string: String(args[0])),
      url.scheme != nil
else {
    fputs("Usage: auth-browser <url> <cookie-output-file>\n", stderr)
    exit(1)
}

let cookieOutputFile = String(args[1])

let app = NSApplication.shared
let delegate = AuthBrowser(url: url, cookieOutputFile: cookieOutputFile)
app.setActivationPolicy(.regular)
app.delegate = delegate
app.run()
