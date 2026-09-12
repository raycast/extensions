//
//  FloatingWindow.swift
//
//
//  Created by Nerd Just on 2024/12/17.
//

import Cocoa

class FloatingWindow: NSPanel {
    
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
    private var mouseEventMonitor: Any?
    
    override init(contentRect: NSRect, 
                  styleMask style: NSWindow.StyleMask,
                  backing backingStoreType: NSWindow.BackingStoreType,
                  defer flag: Bool) {
        super.init(contentRect: contentRect, 
                   styleMask:
                    style, backing:
                    backingStoreType,
                   defer: flag)
        defaultConfig()
        initUI()
    }
    
    private func defaultConfig() {
        backgroundColor = .clear
        isOpaque = false
        hasShadow = false
        level = .floating
        
        addMouseDownMonitor()
    }
    
    private func addMouseDownMonitor() {
        mouseEventMonitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] event in
            guard let self = self else { return event }
            
            let locationInWindow = event.locationInWindow
            let locationInScreen = self.convertToScreen(NSRect(origin: locationInWindow, size: .zero)).origin
            
            if let contentView = self.contentView {
                for subview in contentView.subviews {
                    if subview is SvgaPlaygroundView || subview is NSButton {
                        let frame = subview.window?.convertToScreen(subview.frame) ?? .zero
                        if frame.contains(locationInScreen) {
                            return event
                        }
                    }
                }
            }
            
            NSApplication.shared.terminate(nil)
            return event
        }
    }
    
    deinit {
        if let monitor = mouseEventMonitor {
            NSEvent.removeMonitor(monitor)
        }
    }
    
    private func initUI() {
        createBackgroundView()
        createContentView()
        makeKeyAndOrderFront(nil)
    }
    
    private func createBackgroundView() {
        let contentView = NSView()
        contentView.wantsLayer = true
        contentView.layer?.backgroundColor = NSColor.gray.withAlphaComponent(0.4).cgColor
        self.contentView = contentView
    }
    
    private func createContentView() {
        let width = 500.0
        let height = 650.0
        let x = ((self.contentView?.bounds.width ?? 1000) - width) / 2
        let y = ((self.contentView?.bounds.height ?? 1000) - height) / 2
        
        let webView = SvgaPlaygroundView(frame: CGRect(x: x, y: y, width: width, height: height))
        webView.wantsLayer = true
        webView.layer?.cornerRadius = 20
        webView.layer?.masksToBounds = true
        
        self.contentView?.addSubview(webView)
    
        let dragButton = GlassButton(frame: CGRect(
            x: x + (width - 80) / 2,
            y: y - 15,
            width: 80,
            height: 6
        ))
    
        let dragGesture = NSPanGestureRecognizer(target: self, action: #selector(handleDrag(_:)))
        dragButton.addGestureRecognizer(dragGesture)
        
        self.contentView?.addSubview(dragButton)
    }

    @objc private func handleDrag(_ gesture: NSPanGestureRecognizer) {
        guard let webView = self.contentView?.subviews.first(where: { $0 is SvgaPlaygroundView }),
              let dragButton = self.contentView?.subviews.first(where: { $0 is GlassButton }) else { return }
        
        let translation = gesture.translation(in: self.contentView)
        
        let newWebViewFrame = CGRect(
            x: webView.frame.origin.x + translation.x,
            y: webView.frame.origin.y + translation.y,
            width: webView.frame.width,
            height: webView.frame.height
        )
        
        webView.frame = newWebViewFrame
        dragButton.frame = CGRect(
            x: newWebViewFrame.origin.x + (newWebViewFrame.width - dragButton.frame.width) / 2,
            y: newWebViewFrame.origin.y - 15,
            width: dragButton.frame.width,
            height: dragButton.frame.height
        )
        
        gesture.setTranslation(.zero, in: self.contentView)
    }
}
