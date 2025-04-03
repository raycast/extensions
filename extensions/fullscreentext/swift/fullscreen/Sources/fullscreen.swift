import Cocoa
import RaycastSwiftMacros

class LargeTypeApp {
    let text: String

    init(text: String) {
        self.text = text
    }

    func run() {
        let app = NSApplication.shared
        let delegate = AppDelegate(text: text)
        app.delegate = delegate
        app.run()
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    let text: String
    var window: NSWindow?
    var eventMonitor: Any?
    var globalEventMonitor: Any?

    init(text: String) {
        self.text = text
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Determine which screen to use based on the mouse pointer.
        let mouseLocation = NSEvent.mouseLocation
        if let screenUnderMouse = NSScreen.screens.first(where: { NSMouseInRect(mouseLocation, $0.frame, false) }) {
            createFullScreenWindow(on: screenUnderMouse)
        } else if let mainScreen = NSScreen.main {
            createFullScreenWindow(on: mainScreen)
        } else {
            NSApp.terminate(nil)
        }
        
        // Add an event monitor: left mouse click terminates the app.
        eventMonitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown]) { event in
            if event.type == .leftMouseDown {
                NSApp.terminate(nil)
                return nil  // Prevent event propagation.
            }
            return event
        }

        // Add a global event monitor for keyDown events.
        // This monitor will capture the Escape key even if the window is not active.
        globalEventMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { event in
            if event.keyCode == 53 { // Escape key
                NSApp.terminate(nil)
            }
        }
    }
    
    /// Creates a window that covers the entire screen of the given NSScreen.
    private func createFullScreenWindow(on screen: NSScreen) {
        let screenFrame = screen.frame  // Entire screen.
        let margin: CGFloat = 40         // Inset margin for the text.
        let defaultFontSize: CGFloat = 72
        let defaultFont = NSFont.systemFont(ofSize: defaultFontSize, weight: .bold)
        
        // Compute the ideal text size for a single line using the default font.
        let idealTextSize = (text as NSString).size(withAttributes: [.font: defaultFont])
        
        // Create the window using the full screen's frame.
        createWindow(in: screenFrame, idealTextSize: idealTextSize, defaultFontSize: defaultFontSize, margin: margin)
    }
    
    /// Creates and displays the window in the given rect.
    /// The text is scaled so that it fits within the rect inset by the margin.
    /// If the computed font size would fall below 64, it is forced to 64 and wrapping is enabled.
    private func createWindow(in rect: NSRect, idealTextSize: NSSize, defaultFontSize: CGFloat, margin: CGFloat) {
        let styleMask: NSWindow.StyleMask = [.borderless]
        let window = NSWindow(contentRect: rect,
                              styleMask: styleMask,
                              backing: .buffered,
                              defer: false)
        
        // Cover everything including the menu bar.
        window.level = .screenSaver
        window.isOpaque = false
        window.backgroundColor = NSColor(calibratedWhite: 0.0, alpha: 0.7)
        window.hasShadow = true
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        
        // Inset the available area by the margin.
        let insetRect = rect.insetBy(dx: margin, dy: margin)
        let availableWidth = insetRect.width
        let availableHeight = insetRect.height
        
        // Determine the scale factor based on the single-line measurement.
        let horizontalScale = availableWidth / idealTextSize.width
        let verticalScale = availableHeight / idealTextSize.height
        let computedScale = min(horizontalScale, verticalScale, 1.0)
        
        var finalFontSize: CGFloat
        var shouldWrap = false
        if defaultFontSize * computedScale < 84 {
            finalFontSize = 84
            shouldWrap = true
        } else {
            finalFontSize = defaultFontSize * computedScale
        }
        let finalFont = NSFont.systemFont(ofSize: finalFontSize, weight: .bold)
        
        // Create the text field that covers the entire window.
        let textField = NSTextField(frame: NSRect(x: 0, y: 0, width: rect.width, height: rect.height))
        textField.stringValue = text
        textField.isBezeled = false
        textField.drawsBackground = false
        textField.isEditable = false
        textField.isSelectable = false
        textField.alignment = .center
        textField.font = finalFont
        textField.textColor = .white
        
        // If wrapping is needed, configure the cell to disable single-line mode and wrap words.
        if shouldWrap, let cell = textField.cell as? NSTextFieldCell {
            cell.usesSingleLineMode = false
            cell.wraps = true
            cell.lineBreakMode = .byWordWrapping
        }
        
        window.contentView?.addSubview(textField)
        textField.translatesAutoresizingMaskIntoConstraints = false
        if let contentView = window.contentView {
            NSLayoutConstraint.activate([
                textField.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
                textField.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
                textField.widthAnchor.constraint(lessThanOrEqualToConstant: availableWidth)
            ])
        }
        
        self.window = window
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}

@raycast func fullScreen(text: String) {
    let app = LargeTypeApp(text: text)
    app.run()
}