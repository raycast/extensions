//
//  AppDelegate.swift
//
//
//  Created by Nerd Just on 2024/12/17.
//

import Cocoa

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate  {

    var window: FloatingWindow!
    var eventMonitor: Any?
    var resourceUrlString: String?
    
    func applicationDidFinishLaunching(_ aNotification: Notification) {
        guard let screen = NSScreen.main else { return }
        
        window = FloatingWindow(contentRect: screen.frame,
                                styleMask: [.nonactivatingPanel],
                                backing: .buffered,
                                defer: false)
   
        window.delegate = self
        
        addEventMonitor()
        
        NSApp.setActivationPolicy(.accessory)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        window.makeKeyAndOrderFront(nil)
    }

    func applicationWillTerminate(_ aNotification: Notification) {
        if let eventMonitor = eventMonitor {
            NSEvent.removeMonitor(eventMonitor)
        }
    }

    func windowWillClose(_ notification: Notification) {
        terminateApp()
    }
    
    private func addEventMonitor() {
        eventMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown]) { event in
            if event.keyCode == 53 {
                self.terminateApp()
                return nil
            }
            return event
        }
    }

    private func terminateApp() {
        if let eventMonitor = eventMonitor {
            NSEvent.removeMonitor(eventMonitor)
        }
        NSApplication.shared.terminate(nil)
    }
}
