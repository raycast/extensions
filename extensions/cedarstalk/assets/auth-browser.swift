import Cocoa
import WebKit
import Foundation

let TARGET_HOST = "selfservice.cedarville.edu"
let AUTH_COOKIES: Set<String> = [".ASPXAUTH", "studentselfservice_live"]
let CONFIG_FILE = "/tmp/cedarstalk-auth-config.json"

struct Config: Decodable {
    let signInUrl: String
    let cookieFile: String
    let logFile: String
}

func readConfig() -> (Config, URL)? {
    guard let configData = try? Data(contentsOf: URL(fileURLWithPath: CONFIG_FILE)),
          let config = try? JSONDecoder().decode(Config.self, from: configData),
          let signInURL = URL(string: config.signInUrl)
    else { return nil }
    return (config, signInURL)
}

class CookieObserver: NSObject, WKHTTPCookieStoreObserver {
    weak var browser: AuthBrowser?
    func cookiesDidChange(in cookieStore: WKHTTPCookieStore) {
        browser?.checkCookies(in: cookieStore)
    }
}

class AuthBrowser: NSObject, NSApplicationDelegate, WKNavigationDelegate, NSWindowDelegate {
    let signInURL: URL
    let config: Config
    var window: NSWindow!
    var webView: WKWebView!
    var cookieObserver: CookieObserver!
    var didComplete = false

    init(url: URL, config: Config) {
        self.signInURL = url
        self.config = config
        super.init()
    }

    func log(_ msg: String) {
        let line = "[auth-browser] \(msg)\n"
        fputs(line, stderr)
        if let data = line.data(using: .utf8) {
            if let fh = FileHandle(forWritingAtPath: config.logFile) {
                fh.seekToEndOfFile(); fh.write(data); fh.closeFile()
            } else {
                try? data.write(to: URL(fileURLWithPath: config.logFile))
            }
        }
    }

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
        window.title = "CedarStalk — Sign In"
        window.contentView = webView
        window.delegate = self
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        log("loading \(signInURL.absoluteString)")
        webView.load(URLRequest(url: signInURL))
    }

    func webView(_ webView: WKWebView, didFinish _: WKNavigation!) {
        log("didFinish: \(webView.url?.absoluteString ?? "nil")")
        checkCookies(in: webView.configuration.websiteDataStore.httpCookieStore)
    }

    func checkCookies(in cookieStore: WKHTTPCookieStore) {
        guard !didComplete else { return }
        cookieStore.getAllCookies { [weak self] all in
            guard let self, !self.didComplete else { return }
            if !all.isEmpty {
                let summary = all.map { "\($0.domain)/\($0.name)" }.joined(separator: ", ")
                self.log("cookies (\(all.count)): \(summary)")
            }
            let site = all.filter { $0.domain.contains(TARGET_HOST) }
            guard site.contains(where: { AUTH_COOKIES.contains($0.name) }) else { return }

            self.didComplete = true
            let cookieStr = site.map { "\($0.name)=\($0.value)" }.joined(separator: "; ")
            try? cookieStr.write(toFile: self.config.cookieFile, atomically: true, encoding: .utf8)
            self.log("auth complete, wrote cookie")
            NSApp.terminate(nil)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_: NSApplication) -> Bool { true }

    func windowWillClose(_: Notification) {
        if !didComplete {
            log("window closed without completing auth")
            exit(1)
        }
    }
}

guard let (config, signInURL) = readConfig() else {
    fputs("auth-browser: failed to read config from \(CONFIG_FILE)\n", stderr)
    exit(1)
}

try? "".write(toFile: config.logFile, atomically: true, encoding: .utf8)

let app = NSApplication.shared
let delegate = AuthBrowser(url: signInURL, config: config)
app.setActivationPolicy(.regular)
app.delegate = delegate
app.run()
