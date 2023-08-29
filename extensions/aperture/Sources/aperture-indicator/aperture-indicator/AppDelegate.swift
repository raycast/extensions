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
        }
    }
    
    @objc func openStopRcCommand() {
        if let url = URL(string: "raycast://extensions/jomifepe/aperture/stop.command") {
            NSWorkspace.shared.open(url)
        }
    }
}
