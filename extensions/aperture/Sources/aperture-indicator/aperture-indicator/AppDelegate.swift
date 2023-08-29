import Cocoa
import SwiftUI
import AppKit

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    var statusBarItem: NSStatusItem!

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        self.statusBarItem = NSStatusBar.system.statusItem(withLength: CGFloat(NSStatusItem.variableLength))

        if let button = self.statusBarItem.button {
            button.image = NSImage(named: "Icon")
            button.action = #selector(openStopRcCommand)
            button.attributedTitle = NSAttributedString(string: "Recording", attributes: [NSAttributedString.Key.foregroundColor: NSColor.red])
            button.toolTip = "Aperture (Raycast)"
        }
    }
    
    @objc func openStopRcCommand() {
        if let url = URL(string: "raycast://extensions/jomifepe/aperture/stop.command") {
            NSWorkspace.shared.open(url)
        }
    }
    
    @objc func quit(_ sender: NSMenuItem) {
        NSApplication.shared.terminate(nil)
    }
}
