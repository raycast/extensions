import Cocoa
import WebKit
import Foundation

let TARGET_HOST = "selfservice.cedarville.edu"
let AUTH_COOKIES: Set<String> = [".ASPXAUTH", "studentselfservice_live"]
let SIGN_IN_URL = URL(string: "https://selfservice.cedarville.edu/cedarinfo/directory")!
let COOKIE_FILE = CommandLine.arguments[1]

class CookieObserver: NSObject, WKHTTPCookieStoreObserver {
    weak var browser: AuthBrowser?
    func cookiesDidChange(in cookieStore: WKHTTPCookieStore) {
        browser?.checkCookies(in: cookieStore)
    }
}

class AuthBrowser: NSObject, NSApplicationDelegate, WKNavigationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var cookieObserver: CookieObserver!
    var didComplete = false

    func applicationDidFinishLaunching(_: Notification) {
        let wkConfig = WKWebViewConfiguration()
        wkConfig.websiteDataStore = .nonPersistent()

        cookieObserver = CookieObserver()
        cookieObserver.browser = self
        wkConfig.websiteDataStore.httpCookieStore.add(cookieObserver)

        let rect = NSRect(x: 0, y: 0, width: 520, height: 700)
        webView = WKWebView(frame: rect, configuration: wkConfig)
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]

        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .resizable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Cedarville People Search — Sign In"
        window.contentView = webView
        window.delegate = self
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        webView.load(URLRequest(url: SIGN_IN_URL))
    }

    func webView(_ webView: WKWebView, didFinish _: WKNavigation!) {
        checkCookies(in: webView.configuration.websiteDataStore.httpCookieStore)
    }

    func checkCookies(in cookieStore: WKHTTPCookieStore) {
        guard !didComplete else { return }
        cookieStore.getAllCookies { [weak self] all in
            guard let self, !self.didComplete else { return }
            let site = all.filter { $0.domain.contains(TARGET_HOST) }
            guard site.contains(where: { AUTH_COOKIES.contains($0.name) }) else { return }

            self.didComplete = true
            let cookieStr = site.map { "\($0.name)=\($0.value)" }.joined(separator: "; ")
            // Write non-atomically so the pre-created 0o600 permissions are preserved.
            try? cookieStr.write(toFile: COOKIE_FILE, atomically: false, encoding: .utf8)
            NSApp.terminate(nil)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_: NSApplication) -> Bool { true }

    func windowWillClose(_: Notification) {
        if !didComplete { exit(1) }
    }
}

let app = NSApplication.shared
let delegate = AuthBrowser()
app.setActivationPolicy(.regular)
app.delegate = delegate
app.run()
