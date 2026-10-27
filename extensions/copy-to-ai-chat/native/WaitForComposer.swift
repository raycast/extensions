import AppKit
import ApplicationServices
import Foundation

func attribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
    var value: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success else { return nil }
    return value
}

func textAttribute(_ element: AXUIElement, _ name: String) -> String {
    attribute(element, name) as? String ?? ""
}

func elementAttribute(_ element: AXUIElement, _ name: String) -> AXUIElement? {
    guard let value = attribute(element, name), CFGetTypeID(value) == AXUIElementGetTypeID() else { return nil }
    return (value as! AXUIElement)
}

func pageURL(_ field: AXUIElement) -> URL? {
    var element: AXUIElement? = field
    for _ in 0..<40 {
        guard let current = element else { return nil }
        if textAttribute(current, kAXRoleAttribute) == "AXWebArea" {
            let raw = attribute(current, kAXURLAttribute)
            return (raw as? URL) ?? (raw as? String).flatMap(URL.init(string:))
        }
        element = elementAttribute(current, kAXParentAttribute)
    }
    return nil
}

func pageMatches(_ field: AXUIElement, _ expected: URL) -> Bool {
    let actual = pageURL(field)
    return actual?.scheme == "https" && actual?.host == expected.host && actual?.path == expected.path
}

func normalized(_ text: String) -> String {
    text.replacingOccurrences(of: "\r\n", with: "\n")
        .replacingOccurrences(of: "\r", with: "\n")
        .precomposedStringWithCanonicalMapping
        .trimmingCharacters(in: .whitespacesAndNewlines)
}

let clipboardLock = NSLock()
var restoreClipboard: (() -> Void)?

func restoreSavedClipboard() {
    clipboardLock.lock()
    defer { clipboardLock.unlock() }
    restoreClipboard?()
    restoreClipboard = nil
}

// Use a dispatch handler rather than doing AppKit work in a POSIX signal handler.
let terminationQueue = DispatchQueue(label: "copy-to-ai-chat.termination")
let terminationSources = [SIGTERM, SIGINT].map { number -> DispatchSourceSignal in
    signal(number, SIG_IGN)
    let source = DispatchSource.makeSignalSource(signal: number, queue: terminationQueue)
    source.setEventHandler {
        restoreSavedClipboard()
        exit(128 + number)
    }
    source.resume()
    return source
}

func finish(_ status: String) -> Never {
    restoreSavedClipboard()
    print(status)
    exit(0)
}

guard CommandLine.arguments.count == 3,
      let expectedURL = URL(string: CommandLine.arguments[1]) else { exit(1) }
guard AXIsProcessTrusted() else { finish("accessibility") }
let expectedLabel = CommandLine.arguments[2]
let expectedText = String(data: FileHandle.standardInput.readDataToEndOfFile(), encoding: .utf8) ?? ""
guard !normalized(expectedText).isEmpty else { finish("filled") }
let placeholder = ["gemini.google.com": "Ask Gemini", "chatgpt.com": "Ask ChatGPT", "grok.com": "Ask Grok anything"][expectedURL.host ?? ""] ?? ""

// Only acquire a field in the foreground. After acquisition, retain this exact
// accessibility element so text is only entered into the intended prompt.
let deadline = Date().addingTimeInterval(20)
var observedChrome = false
var readySince: Date?
var target: AXUIElement?
var browser: AXUIElement?
while Date() < deadline {
    guard let app = NSWorkspace.shared.frontmostApplication, app.bundleIdentifier == "com.google.Chrome" else {
        if observedChrome { finish("focus-changed") }
        Thread.sleep(forTimeInterval: 0.1)
        continue
    }
    observedChrome = true
    let chrome = AXUIElementCreateApplication(app.processIdentifier)
    if let field = elementAttribute(chrome, kAXFocusedUIElementAttribute),
       [kAXTextAreaRole, kAXComboBoxRole].contains(textAttribute(field, kAXRoleAttribute)),
       textAttribute(field, kAXDescriptionAttribute) == expectedLabel,
       pageMatches(field, expectedURL) {
        let value = normalized(textAttribute(field, kAXValueAttribute))
        if !value.isEmpty && value != placeholder && value != normalized(expectedText) { finish("draft") }
        if let since = readySince, Date().timeIntervalSince(since) >= 0.3 {
            target = field
            browser = chrome
            break
        }
        if readySince == nil { readySince = Date() }
    } else { readySince = nil }
    Thread.sleep(forTimeInterval: 0.1)
}
guard var field = target, let browser else { finish("timeout") }
var browserPID: pid_t = 0
guard AXUIElementGetPid(browser, &browserPID) == .success else { finish("focus-changed") }

func composerStillFocused() -> Bool {
    guard NSWorkspace.shared.frontmostApplication?.processIdentifier == browserPID,
          let focused = elementAttribute(browser, kAXFocusedUIElementAttribute) else { return false }
    return CFEqual(focused, field) && pageMatches(focused, expectedURL)
}

guard composerStillFocused() else { finish("focus-changed") }
var didPaste = false

func pasteMenuItem(_ element: AXUIElement, depth: Int = 0) -> AXUIElement? {
    guard depth < 5 else { return nil }
    if textAttribute(element, kAXMenuItemCmdCharAttribute).lowercased() == "v",
       let modifiers = attribute(element, kAXMenuItemCmdModifiersAttribute) as? NSNumber,
       modifiers.intValue == 0,
       (attribute(element, kAXEnabledAttribute) as? Bool) == true {
        return element
    }
    for child in (attribute(element, kAXChildrenAttribute) as? [AXUIElement]) ?? [] {
        if let item = pasteMenuItem(child, depth: depth + 1) { return item }
    }
    return nil
}

// Chrome's accessibility text entry dispatches the editor's input events. This
// bypasses clipboard HTML/RTF conversions without changing the user's clipboard.
if normalized(textAttribute(field, kAXValueAttribute)) != normalized(expectedText) {
    var settable = DarwinBoolean(false)
    if AXUIElementIsAttributeSettable(field, kAXValueAttribute as CFString, &settable) == .success && settable.boolValue {
        guard AXUIElementSetAttributeValue(field, kAXValueAttribute as CFString, expectedText as CFString) == .success else {
            finish("input-unavailable")
        }
    } else {
        // Invoke Chrome's Paste menu action, avoiding keyboard-layout assumptions
        // and never sending an unaddressed keystroke to the foreground app.
        guard let menuBar = elementAttribute(browser, kAXMenuBarAttribute),
              let pasteAction = pasteMenuItem(menuBar) else { finish("input-unavailable") }
        let pasteboard = NSPasteboard.general
        let originalItems = (pasteboard.pasteboardItems ?? []).map { item -> NSPasteboardItem in
            let copy = NSPasteboardItem()
            for type in item.types {
                if let data = item.data(forType: type) { copy.setData(data, forType: type) }
            }
            copy.setData(Data(), forType: NSPasteboard.PasteboardType("org.nspasteboard.AutoGeneratedType"))
            copy.setData(Data(), forType: NSPasteboard.PasteboardType("org.nspasteboard.TransientType"))
            return copy
        }
        guard composerStillFocused() else { finish("focus-changed") }
        let current = normalized(textAttribute(field, kAXValueAttribute))
        guard current.isEmpty || current == placeholder || current == normalized(expectedText) else { finish("draft") }

        let pasteItem = NSPasteboardItem()
        pasteItem.setString(expectedText, forType: .string)
        pasteItem.setData(Data(), forType: NSPasteboard.PasteboardType("org.nspasteboard.TransientType"))
        pasteItem.setData(Data(), forType: NSPasteboard.PasteboardType("org.nspasteboard.ConcealedType"))
        clipboardLock.lock()
        pasteboard.prepareForNewContents(with: .currentHostOnly)
        let written = pasteboard.writeObjects([pasteItem])
        let changeCount = pasteboard.changeCount
        restoreClipboard = {
            // Don't overwrite anything the user copied while the paste completed.
            if pasteboard.changeCount == changeCount {
                pasteboard.prepareForNewContents(with: .currentHostOnly)
                if !originalItems.isEmpty { pasteboard.writeObjects(originalItems) }
            }
        }
        clipboardLock.unlock()
        guard written, composerStillFocused() else { finish("focus-changed") }
        guard AXUIElementPerformAction(pasteAction, kAXPressAction as CFString) == .success else {
            finish("input-unavailable")
        }
        didPaste = true
    }
}
let verificationDeadline = Date().addingTimeInterval(5)
while Date() < verificationDeadline {
    // Rich-text editors may replace their accessibility element after entry.
    if let current = elementAttribute(browser, kAXFocusedUIElementAttribute),
       [kAXTextAreaRole, kAXComboBoxRole].contains(textAttribute(current, kAXRoleAttribute)),
       textAttribute(current, kAXDescriptionAttribute) == expectedLabel,
       pageMatches(current, expectedURL) {
        field = current
    }
    if pageMatches(field, expectedURL),
       normalized(textAttribute(field, kAXValueAttribute)) == normalized(expectedText) {
        finish("filled")
    }
    Thread.sleep(forTimeInterval: 0.1)
}
finish(didPaste ? "pasted-unverified" : "input-unavailable")
