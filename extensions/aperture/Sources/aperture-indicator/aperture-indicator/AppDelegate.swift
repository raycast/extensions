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
            button.toolTip = "Aperture (Raycast)"
            button.attributedTitle = NSAttributedString(string: "Recording", attributes: [NSAttributedString.Key.foregroundColor: NSColor.red])
            button.action = #selector(handleButtonClick(_:))
            button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }
    }
    
    @objc func handleButtonClick(_ sender: NSStatusItem) {
        let event = NSApp.currentEvent!
        
        if event.type == NSEvent.EventType.rightMouseUp {
            let rightClickMenu = NSMenu()
            
            let titleMenuItem = NSMenuItem(title: "Aperture (Raycast)", action: nil, keyEquivalent: "")
            titleMenuItem.isEnabled = false;
            
            let menuItems = [
                titleMenuItem,
                NSMenuItem.separator(),
                NSMenuItem(title: "Stop Recording", action: #selector(openStopCommand), keyEquivalent: "s"),
                NSMenuItem.separator(),
                NSMenuItem(title: "Quit", action: #selector(quit(_:)), keyEquivalent: "q")
            ]
            rightClickMenu.items = menuItems
            statusBarItem.menu = rightClickMenu
            statusBarItem.button?.performClick(nil)
            statusBarItem.menu = nil
        } else {
            openStopCommand()
        }

    }
    
    @objc func openStopCommand() {
        if let url = URL(string: "raycast://extensions/jomifepe/aperture/record.command") {
            NSWorkspace.shared.open(url)
        }
    }
    
    @objc func quit(_ sender: NSMenuItem) {
        NSApplication.shared.terminate(nil)
    }
}
