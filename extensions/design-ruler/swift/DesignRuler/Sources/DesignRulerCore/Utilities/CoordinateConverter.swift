import AppKit

package enum CoordinateConverter {
    /// Convert from AppKit coordinates (bottom-left origin) to AX/CG coordinates (top-left origin)
    package static func appKitToAX(_ point: NSPoint) -> CGPoint {
        guard let screenHeight = NSScreen.screens.first?.frame.height else {
            return CGPoint(x: point.x, y: point.y)
        }
        return CGPoint(x: point.x, y: screenHeight - point.y)
    }

    /// Convert from AX/CG coordinates (top-left origin) to AppKit coordinates (bottom-left origin)
    package static func axToAppKit(_ point: CGPoint) -> NSPoint {
        guard let screenHeight = NSScreen.screens.first?.frame.height else {
            return NSPoint(x: point.x, y: point.y)
        }
        return NSPoint(x: point.x, y: screenHeight - point.y)
    }

    /// Convert AppKit rect (bottom-left origin) to CG rect (top-left origin)
    package static func appKitRectToCG(_ rect: NSRect) -> CGRect {
        guard let mainHeight = NSScreen.screens.first?.frame.height else {
            return CGRect(x: rect.origin.x, y: rect.origin.y, width: rect.width, height: rect.height)
        }
        return CGRect(
            x: rect.origin.x,
            y: mainHeight - rect.origin.y - rect.height,
            width: rect.width,
            height: rect.height
        )
    }

    /// Convert CG rect (top-left origin) to AppKit rect (bottom-left origin)
    package static func cgRectToAppKit(_ rect: CGRect) -> NSRect {
        guard let mainHeight = NSScreen.screens.first?.frame.height else {
            return NSRect(x: rect.origin.x, y: rect.origin.y, width: rect.width, height: rect.height)
        }
        return NSRect(
            x: rect.origin.x,
            y: mainHeight - rect.origin.y - rect.height,
            width: rect.width,
            height: rect.height
        )
    }
}
