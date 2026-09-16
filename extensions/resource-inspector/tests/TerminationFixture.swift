import AppKit

// Disposable UI fixture: no files are opened, saved, or changed.
class Delegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    func applicationDidFinishLaunching(_ notification: Notification) {
        window = NSWindow(contentRect: NSRect(x: 200, y: 200, width: 420, height: 140), styleMask: [.titled, .closable], backing: .buffered, defer: false)
        window.title = "Resource Inspector Test"
        let label = NSTextField(labelWithString: "Disposable test app — no real documents.\nQuit shows a simulated unsaved-work prompt.")
        label.frame = NSRect(x: 20, y: 40, width: 380, height: 70)
        window.contentView?.addSubview(label)
        window.makeKeyAndOrderFront(nil)
    }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        let alert = NSAlert()
        alert.messageText = "Keep this disposable test app open?"
        alert.informativeText = "This simulates unsaved work. Cancel must leave the app running."
        alert.addButton(withTitle: "Cancel")
        alert.addButton(withTitle: "Discard Test Changes")
        return alert.runModal() == .alertFirstButtonReturn ? .terminateCancel : .terminateNow
    }
}
let app = NSApplication.shared
let delegate = Delegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
