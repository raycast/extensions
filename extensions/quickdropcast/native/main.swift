import AppKit
import Foundation

struct Request: Decodable {
    let kind: String
    let text: String?
    let paths: [String]?
    let instruction: String?
    let shareFailureMessage: String?
    let rightToLeft: Bool?
}

func finish(_ status: String, _ message: String? = nil, code: Int32 = 0) -> Never {
    var result = ["status": status]
    if let message = message { result["errorCode"] = message }
    if let data = try? JSONSerialization.data(withJSONObject: result) {
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
    }
    exit(code)
}

final class ShareHost: NSObject, NSApplicationDelegate, NSSharingServiceDelegate, NSWindowDelegate {
    let items: [Any]
    let instruction: String
    let shareFailureMessage: String
    let rightToLeft: Bool
    var window: NSWindow!
    var service: NSSharingService?
    init(items: [Any], instruction: String, shareFailureMessage: String, rightToLeft: Bool) {
        self.items = items; self.instruction = instruction; self.rightToLeft = rightToLeft
        self.shareFailureMessage = shareFailureMessage
    }
    func applicationDidFinishLaunching(_ notification: Notification) {
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 480, height: 160), styleMask: [.titled, .closable], backing: .buffered, defer: false)
        window.title = "QuickDropcast"
        window.isReleasedWhenClosed = false
        window.delegate = self
        let label = NSTextField(wrappingLabelWithString: instruction)
        label.frame = NSRect(x: 20, y: 20, width: 440, height: 120)
        label.baseWritingDirection = rightToLeft ? .rightToLeft : .leftToRight
        label.alignment = rightToLeft ? .right : .left
        label.setFrameSize(NSSize(width: 440, height: max(120, label.sizeThatFits(NSSize(width: 440, height: CGFloat.greatestFiniteMagnitude)).height)))
        window.setContentSize(NSSize(width: 480, height: label.frame.height + 40))
        window.contentView?.addSubview(label)
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        guard let service = NSSharingService(named: NSSharingService.Name("com.leonboettger.neardrop.ShareExtension")) else {
            finish("error", "shareDisabled", code: 1)
        }
        self.service = service
        service.delegate = self
        guard service.canPerform(withItems: items) else {
            finish("error", "unsupportedContent", code: 1)
        }
        service.perform(withItems: items)
        // Let Raycast reset only after this independent process has opened the share UI.
        FileHandle.standardOutput.write(Data("{\"status\":\"ready\"}\n".utf8))
    }
    func sharingService(_ sharingService: NSSharingService, sourceWindowForShareItems items: [Any], sharingContentScope: UnsafeMutablePointer<NSSharingService.SharingContentScope>) -> NSWindow? { window }
    func sharingService(_ sharingService: NSSharingService, didShareItems items: [Any]) { finish("shared") }
    func sharingService(_ sharingService: NSSharingService, didFailToShareItems items: [Any], error: Error) {
        if (error as NSError).code == NSUserCancelledError { finish("cancelled") }
        // Raycast may have unloaded the command after readiness; report failures here too.
        let alert = NSAlert()
        alert.alertStyle = .warning
        alert.messageText = "QuickDropcast"
        alert.informativeText = shareFailureMessage
        NSApp.activate(ignoringOtherApps: true)
        alert.runModal()
        finish("error", "shareFailed", code: 1)
    }
    func windowShouldClose(_ sender: NSWindow) -> Bool { finish("cancelled") }
}

let data = FileHandle.standardInput.readDataToEndOfFile()
guard let request = try? JSONDecoder().decode(Request.self, from: data) else {
    finish("error", "badRequest", code: 1)
}
var items: [Any] = []
switch request.kind {
case "text":
    guard let text = request.text, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { finish("error", "emptyText", code: 1) }
    items = [text]
case "files":
    guard let paths = request.paths, !paths.isEmpty else { finish("error", "filesRequired", code: 1) }
    for path in paths {
        var directory: ObjCBool = false
        guard path.hasPrefix("/"), FileManager.default.fileExists(atPath: path, isDirectory: &directory), !directory.boolValue, FileManager.default.isReadableFile(atPath: path) else {
            finish("error", "fileUnavailable", code: 1)
        }
        items.append(URL(fileURLWithPath: path))
    }
default: finish("error", "unsupportedKind", code: 1)
}
let app = NSApplication.shared
app.setActivationPolicy(.regular)
let host = ShareHost(items: items, instruction: request.instruction ?? "Choose the device in QuickDrop. Close this window to cancel.", shareFailureMessage: request.shareFailureMessage ?? "QuickDrop could not share the content. Check its window and the device connection.", rightToLeft: request.rightToLeft ?? false)
app.delegate = host
app.run()
