//
//  GlassButton.swift
//
//
//  Created by Nerd Just on 2024/12/17.
//

import Cocoa

class GlassButton: NSButton {
    private let visualEffectView = NSVisualEffectView()
    
    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        setupButton()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupButton()
    }
    
    private func setupButton() {
        title = ""
        visualEffectView.frame = bounds
        visualEffectView.autoresizingMask = [.width, .height]
        visualEffectView.blendingMode = .behindWindow
        visualEffectView.material = .hudWindow
        visualEffectView.state = .active
        visualEffectView.wantsLayer = true
        
        visualEffectView.layer?.cornerRadius = frame.height / 2
        visualEffectView.layer?.masksToBounds = true
        
        addSubview(visualEffectView, positioned: .below, relativeTo: nil)
        
        wantsLayer = true
        layer?.cornerRadius = frame.height / 2
        isBordered = false
        
        addTrackingArea(NSTrackingArea(
            rect: bounds,
            options: [.mouseEnteredAndExited, .activeAlways],
            owner: self,
            userInfo: nil
        ))
        
        addCursorRect(bounds, cursor: .closedHand)
    }
    
    override func mouseEntered(with event: NSEvent) {
        super.mouseEntered(with: event)
        NSCursor.closedHand.push()
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.2
            visualEffectView.animator().material = .selection
        }
    }
    
    override func mouseExited(with event: NSEvent) {
        super.mouseExited(with: event)
        NSCursor.pop()
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.2
            visualEffectView.animator().material = .hudWindow
        }
    }
} 
