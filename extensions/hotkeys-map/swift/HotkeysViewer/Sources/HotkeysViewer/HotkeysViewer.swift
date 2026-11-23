import ApplicationServices
import Cocoa
import RaycastSwiftMacros
import WebKit

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    let filePath: String
    var isCapturingKey = false
    var captureStartedAt: TimeInterval = 0

    static let macKeyCodes: [Int: String] = [
        0:"A",1:"S",2:"D",3:"F",4:"H",5:"G",6:"Z",7:"X",8:"C",9:"V",11:"B",12:"Q",13:"W",14:"E",15:"R",
        16:"Y",17:"T",18:"1",19:"2",20:"3",21:"4",22:"6",23:"5",24:"=",25:"9",26:"7",27:"-",28:"8",29:"0",
        30:"]",31:"O",32:"U",33:"[",34:"I",35:"P",36:"Enter",37:"L",38:"J",39:"'",40:"K",41:";",42:"\\",
        43:",",44:"/",45:"N",46:"M",47:".",48:"Tab",49:"Space",50:"`",51:"Backspace",53:"Escape",
        122:"F1",120:"F2",99:"F3",118:"F4",96:"F5",97:"F6",98:"F7",100:"F8",101:"F9",109:"F10",103:"F11",111:"F12",
        123:"ArrowLeft",124:"ArrowRight",125:"ArrowDown",126:"ArrowUp"
    ]

    init(filePath: String) {
        self.filePath = filePath
    }

    var userStateURL: URL {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dir = appSupport.appendingPathComponent("RaycastHotkeysMap", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("user-state.json")
    }

    func setupMenuBar() {
        let mainMenu = NSMenu()

        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Quit Raycast Hotkeys Map", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)

        let fileMenuItem = NSMenuItem()
        let fileMenu = NSMenu(title: "File")
        fileMenu.addItem(withTitle: "Print / Save as PDF…", action: #selector(printDocument(_:)), keyEquivalent: "p")
        fileMenu.addItem(NSMenuItem.separator())
        fileMenu.addItem(withTitle: "Close Window", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        fileMenuItem.submenu = fileMenu
        mainMenu.addItem(fileMenuItem)

        let editMenuItem = NSMenuItem()
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editMenuItem.submenu = editMenu
        mainMenu.addItem(editMenuItem)

        NSApp.mainMenu = mainMenu
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        setupMenuBar()
        let frame = NSRect(x: 0, y: 0, width: 1360, height: 860)
        window = NSWindow(
            contentRect: frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Raycast Hotkeys Map"
        window.minSize = NSSize(width: 960, height: 640)
        window.center()
        window.setFrameAutosaveName("RaycastHotkeysMapWindow")
        window.appearance = NSAppearance(named: .darkAqua)
        window.titlebarAppearsTransparent = true
        window.backgroundColor = NSColor(red: 0.047, green: 0.051, blue: 0.063, alpha: 1.0)

        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        if let stateStr = try? String(contentsOf: userStateURL, encoding: .utf8), !stateStr.isEmpty {
            let script = WKUserScript(source: "window.__PERSISTED_STATE = \(stateStr);", injectionTime: .atDocumentStart, forMainFrameOnly: true)
            config.userContentController.addUserScript(script)
        }
        config.userContentController.add(self, name: "mcpFetch")
        config.userContentController.add(self, name: "printPage")
        config.userContentController.add(self, name: "saveHotkeysJson")
        config.userContentController.add(self, name: "saveUserState")
        config.userContentController.add(self, name: "saveExportFile")
        config.userContentController.add(self, name: "setKeyCapture")
        config.userContentController.add(self, name: "listRunningApps")
        config.userContentController.add(self, name: "scanAppShortcuts")
        config.userContentController.add(self, name: "scanMacosShortcuts")
        webView = WKWebView(frame: window.contentView!.bounds, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.autoresizingMask = [.width, .height]
        window.contentView?.addSubview(webView)

        let url = URL(fileURLWithPath: filePath)
        let iconURL = url.deletingLastPathComponent().appendingPathComponent("app-icon.png")
        if let icon = NSImage(contentsOf: iconURL) {
            NSApp.applicationIconImage = icon
        }
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            guard let self = self, self.isCapturingKey else { return event }
            let code = Int(event.keyCode)
            guard let keyStr = AppDelegate.macKeyCodes[code] else { return event }
            let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
            let sourcePID = event.cgEvent?.getIntegerValueField(.eventSourceUnixProcessID) ?? 0
            if sourcePID != 0 && !(flags.contains(.control) && flags.contains(.option) && flags.contains(.command)) {
                return event
            }
            if code == 8 && flags == .command && (Date().timeIntervalSince1970 - self.captureStartedAt) < 0.35 {
                return event
            }
            let payload: [String: Any] = [
                "key": keyStr,
                "ctrl": flags.contains(.control),
                "opt": flags.contains(.option),
                "shift": flags.contains(.shift),
                "cmd": flags.contains(.command)
            ]
            if let data = try? JSONSerialization.data(withJSONObject: payload),
               let json = String(data: data, encoding: .utf8) {
                self.webView.evaluateJavaScript("window.__onNativeKeyCapture && window.__onNativeKeyCapture(\(json))")
            }
            return nil
        }
    }

    func reportSaveError(_ msg: String) {
        if let data = try? JSONSerialization.data(withJSONObject: ["message": msg]),
           let json = String(data: data, encoding: .utf8) {
            self.webView.evaluateJavaScript("window.__onNativeSaveError && window.__onNativeSaveError(\(json))")
        }
    }

    @objc func printDocument(_ sender: Any?) {
        let printInfo = NSPrintInfo.shared.copy() as! NSPrintInfo
        printInfo.orientation = .landscape
        printInfo.horizontalPagination = .fit
        printInfo.verticalPagination = .automatic
        printInfo.isHorizontallyCentered = true
        let op = webView.printOperation(with: printInfo)
        op.showsPrintPanel = true
        op.showsProgressPanel = true
        op.runModal(for: window, delegate: nil, didRun: nil, contextInfo: nil)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "printPage" {
            printDocument(nil)
            return
        }
        if message.name == "saveExportFile",
           let body = message.body as? [String: Any],
           let filename = body["filename"] as? String,
           let content = body["content"] as? String {
            let panel = NSSavePanel()
            panel.nameFieldStringValue = filename
            panel.canCreateDirectories = true
            panel.beginSheetModal(for: window) { [weak self] resp in
                guard resp == .OK, let dest = panel.url else { return }
                do {
                    try content.write(to: dest, atomically: true, encoding: .utf8)
                } catch {
                    guard let self = self else { return }
                    let alert = NSAlert()
                    alert.alertStyle = .warning
                    alert.messageText = "Could not save \(filename)"
                    alert.informativeText = error.localizedDescription
                    alert.addButton(withTitle: "OK")
                    alert.beginSheetModal(for: self.window, completionHandler: nil)
                }
            }
            return
        }
        if message.name == "saveHotkeysJson",
           let body = message.body as? [String: Any],
           let json = body["json"] as? String {
            let appSupportDir = userStateURL.deletingLastPathComponent()
            let userJsonURL = appSupportDir.appendingPathComponent("hotkeys.json")
            do {
                try FileManager.default.createDirectory(at: appSupportDir, withIntermediateDirectories: true)
                try json.write(to: userJsonURL, atomically: true, encoding: .utf8)
            } catch {
                self.reportSaveError("Could not save hotkeys.json: \(error.localizedDescription)")
            }
            return
        }
        if message.name == "saveUserState",
           let body = message.body as? [String: Any],
           let json = body["json"] as? String {
            do {
                try FileManager.default.createDirectory(at: userStateURL.deletingLastPathComponent(), withIntermediateDirectories: true)
                try json.write(to: userStateURL, atomically: true, encoding: .utf8)
            } catch {
                self.reportSaveError("Could not save user-state.json: \(error.localizedDescription)")
            }
            return
        }
        if message.name == "setKeyCapture",
           let body = message.body as? [String: Any],
           let active = body["active"] as? Bool {
            if active && !self.isCapturingKey {
                self.captureStartedAt = Date().timeIntervalSince1970
            }
            self.isCapturingKey = active
            return
        }
        if message.name == "listRunningApps" {
            let apps = NSWorkspace.shared.runningApplications
                .filter { $0.activationPolicy == .regular && $0.localizedName != nil && $0.executableURL?.lastPathComponent != "HotkeysViewer" }
                .map { ["name": $0.localizedName!, "pid": Int($0.processIdentifier)] as [String: Any] }
                .sorted { ($0["name"] as! String).localizedCaseInsensitiveCompare($1["name"] as! String) == .orderedAscending }
            if let data = try? JSONSerialization.data(withJSONObject: apps),
               let str = String(data: data, encoding: .utf8) {
                self.webView.evaluateJavaScript("window.__onRunningApps(\(str))")
            }
            return
        }
        if message.name == "scanMacosShortcuts" {
            let items = self.scanMacosSymbolicHotkeys()
            if let data = try? JSONSerialization.data(withJSONObject: ["items": items]),
               let str = String(data: data, encoding: .utf8) {
                self.webView.evaluateJavaScript("window.__onMacosScanned(\(str))")
            }
            return
        }
        if message.name == "scanAppShortcuts",
           let body = message.body as? [String: Any],
           let pid = body["pid"] as? Int {
            let wv = self.webView
            DispatchQueue.global(qos: .userInitiated).async {
                let result = AppDelegate.scanMenus(pid: pid_t(pid))
                if let data = try? JSONSerialization.data(withJSONObject: result),
                   let str = String(data: data, encoding: .utf8) {
                    DispatchQueue.main.async {
                        wv?.evaluateJavaScript("window.__onScannedShortcuts(\(str))")
                    }
                }
            }
            return
        }
        guard message.name == "mcpFetch",
              let body = message.body as? [String: Any],
              let id = body["id"] as? String,
              let urlStr = body["url"] as? String,
              let url = URL(string: urlStr) else { return }

        // Restrict native HTTP bridge strictly to loopback MCP endpoints
        let host = (url.host ?? "").lowercased()
        let allowedHosts: Set<String> = ["127.0.0.1", "localhost", "::1"]
        guard allowedHosts.contains(host), (url.scheme == "http" || url.scheme == "https") else {
            let respObj: [String: Any] = ["id": id, "status": 0, "sessionId": "", "text": "", "error": "Blocked non-loopback MCP endpoint URL."]
            if let jsonData = try? JSONSerialization.data(withJSONObject: respObj),
               let jsonStr = String(data: jsonData, encoding: .utf8) {
                self.webView.evaluateJavaScript("window.__onMcpFetchResult(\(jsonStr))")
            }
            return
        }

        var req = URLRequest(url: url)
        req.httpMethod = (body["method"] as? String) ?? "POST"
        if let headers = body["headers"] as? [String: String] {
            for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
        }
        if let payload = body["body"] as? String {
            req.httpBody = payload.data(using: .utf8)
        }

        let wv = self.webView
        URLSession.shared.dataTask(with: req) { data, response, error in
            let httpResp = response as? HTTPURLResponse
            let status = httpResp?.statusCode ?? 0
            let sessionId = httpResp?.value(forHTTPHeaderField: "Mcp-Session-Id") ?? ""
            let text = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            let errMsg = error?.localizedDescription ?? ""
            let respObj: [String: Any] = ["id": id, "status": status, "sessionId": sessionId, "text": text, "error": errMsg]
            if let jsonData = try? JSONSerialization.data(withJSONObject: respObj),
               let jsonStr = String(data: jsonData, encoding: .utf8) {
                DispatchQueue.main.async {
                    wv?.evaluateJavaScript("window.__onMcpFetchResult(\(jsonStr))")
                }
            }
        }.resume()
    }

    func scanMacosSymbolicHotkeys() -> [[String: String]] {
        let defaults: [String: (String, String)] = [
            "64": ("Spotlight Search", "⌘Space"),
            "65": ("Finder Search Window", "⌥⌘Space"),
            "28": ("Screenshot Full (File)", "⇧⌘3"),
            "29": ("Screenshot Full (Clipboard)", "⌃⇧⌘3"),
            "30": ("Screenshot Area (File)", "⇧⌘4"),
            "31": ("Screenshot Area (Clipboard)", "⌃⇧⌘4"),
            "184": ("Screenshot & Recording UI", "⇧⌘5"),
            "32": ("Mission Control", "⌃ArrowUp"),
            "33": ("Application Windows", "⌃ArrowDown"),
            "36": ("Show Desktop", "F11"),
            "60": ("Previous Input Source", "⌃Space"),
            "61": ("Next Input Source", "⌃⌥Space"),
            "52": ("Turn Dock Hiding On/Off", "⌥⌘D"),
            "79": ("Move Left a Space", "⌃ArrowLeft"),
            "81": ("Move Right a Space", "⌃ArrowRight")
        ]
        let plistPath = (NSHomeDirectory() as NSString).appendingPathComponent("Library/Preferences/com.apple.symbolichotkeys.plist")
        let plist = NSDictionary(contentsOfFile: plistPath)
        let overrides = (plist?["AppleSymbolicHotKeys"] as? [String: Any]) ?? [:]

        var result: [[String: String]] = []
        for (id, (title, defaultCombo)) in defaults {
            if let entry = overrides[id] as? [String: Any] {
                if let enabled = entry["enabled"] as? Bool, !enabled { continue }
                if let val = entry["value"] as? [String: Any],
                   let params = val["parameters"] as? [Int], params.count >= 3,
                   let keyStr = AppDelegate.macKeyCodes[params[1]] {
                    let mods = params[2]
                    var combo = ""
                    if (mods & 262144) != 0 { combo += "⌃" }
                    if (mods & 524288) != 0 { combo += "⌥" }
                    if (mods & 131072) != 0 { combo += "⇧" }
                    if (mods & 1048576) != 0 { combo += "⌘" }
                    if !combo.isEmpty {
                        result.append(["title": title, "combo": combo + keyStr])
                        continue
                    }
                }
            }
            result.append(["title": title, "combo": defaultCombo])
        }
        return result.sorted { $0["title"]! < $1["title"]! }
    }

    nonisolated static func scanMenus(pid: pid_t) -> [String: Any] {
        let opts = ["AXTrustedCheckOptionPrompt": true] as CFDictionary
        if !AXIsProcessTrustedWithOptions(opts) {
            return ["error": "Accessibility permission required. Enable HotkeysViewer in System Settings → Privacy & Security → Accessibility, then click Scan again."]
        }
        let appEl = AXUIElementCreateApplication(pid)
        var menuBarRef: CFTypeRef?
        let err = AXUIElementCopyAttributeValue(appEl, kAXMenuBarAttribute as CFString, &menuBarRef)
        guard err == .success, let menuBar = menuBarRef else {
            return ["error": "Could not read menu bar for this app (it may not expose native macOS menus)."]
        }
        var items: [[String: String]] = []
        var seen = Set<String>()
        func walk(_ el: AXUIElement, depth: Int) {
            if depth > 6 { return }
            var titleRef: CFTypeRef?
            var cmdRef: CFTypeRef?
            var modsRef: CFTypeRef?
            AXUIElementCopyAttributeValue(el, kAXTitleAttribute as CFString, &titleRef)
            AXUIElementCopyAttributeValue(el, kAXMenuItemCmdCharAttribute as CFString, &cmdRef)
            AXUIElementCopyAttributeValue(el, kAXMenuItemCmdModifiersAttribute as CFString, &modsRef)
            if let title = titleRef as? String, !title.isEmpty,
               let cmd = cmdRef as? String, !cmd.isEmpty {
                let modMask = (modsRef as? Int) ?? 0
                var combo = ""
                if (modMask & 4) != 0 { combo += "⌃" }
                if (modMask & 2) != 0 { combo += "⌥" }
                if (modMask & 1) != 0 { combo += "⇧" }
                if (modMask & 8) == 0 { combo += "⌘" }
                combo += cmd.uppercased()
                let dedup = "\(title)|\(combo)"
                if !seen.contains(dedup) {
                    seen.insert(dedup)
                    items.append(["title": title, "combo": combo])
                }
            }
            var childrenRef: CFTypeRef?
            if AXUIElementCopyAttributeValue(el, kAXChildrenAttribute as CFString, &childrenRef) == .success,
               let children = childrenRef as? [AXUIElement] {
                for child in children { walk(child, depth: depth + 1) }
            }
        }
        walk(menuBar as! AXUIElement, depth: 0)
        return ["items": items]
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping @MainActor @Sendable () -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.beginSheetModal(for: window) { _ in completionHandler() }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping @MainActor @Sendable (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        alert.beginSheetModal(for: window) { resp in completionHandler(resp == .alertFirstButtonReturn) }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping @MainActor @Sendable (String?) -> Void) {
        let alert = NSAlert()
        alert.messageText = prompt
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 280, height: 24))
        input.stringValue = defaultText ?? ""
        alert.accessoryView = input
        alert.window.initialFirstResponder = input
        alert.beginSheetModal(for: window) { resp in
            completionHandler(resp == .alertFirstButtonReturn ? input.stringValue : nil)
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url, url.scheme != "file" {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

@raycast
func runViewer(htmlPath: String) async {
    await MainActor.run {
        let currentPID = ProcessInfo.processInfo.processIdentifier
        for running in NSWorkspace.shared.runningApplications {
            if running.processIdentifier != currentPID,
               running.executableURL?.lastPathComponent == "HotkeysViewer" {
                running.activate(options: [.activateAllWindows])
                return
            }
        }
        let app = NSApplication.shared
        app.setActivationPolicy(.regular)
        let delegate = AppDelegate(filePath: htmlPath)
        app.delegate = delegate
        app.run()
    }
}
