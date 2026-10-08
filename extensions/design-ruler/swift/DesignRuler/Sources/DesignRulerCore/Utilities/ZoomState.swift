import AppKit
import QuartzCore

// MARK: - ZoomLevel

/// Discrete zoom levels the overlay can cycle through.
/// Cycles: 1x -> 2x -> 4x -> 1x.
package enum ZoomLevel: CGFloat {
    case one = 1.0
    case two = 2.0
    case four = 4.0

    /// Advance to the next zoom level in the cycle.
    package func next() -> ZoomLevel {
        switch self {
        case .one:  return .two
        case .two:  return .four
        case .four: return .one
        }
    }
}

// MARK: - ZoomState

/// Per-window zoom state tracking current zoom level and pan offset.
/// Value type so each OverlayWindow owns an independent copy.
package struct ZoomState {
    package var level: ZoomLevel = .one
    package var panOffset: CGPoint = .zero

    /// Whether the overlay is zoomed beyond 1x.
    package var isZoomed: Bool { level != .one }

    /// The CATransform3D to apply to the content layer.
    /// Composes scale then translate (translate in scaled-space for capture-space pan offsets).
    package var contentTransform: CATransform3D {
        let s = level.rawValue
        let scaled = CATransform3DMakeScale(s, s, 1)
        return CATransform3DTranslate(scaled, panOffset.x, panOffset.y, 0)
    }

    /// Reset to default unzoomed state.
    package mutating func reset() {
        level = .one
        panOffset = .zero
    }
}

// MARK: - Coordinate Mapping

/// Convert a window-local cursor point to the corresponding point in the original (unzoomed) capture.
/// At 1x with no pan, this is identity.
package func windowPointToCapturePoint(
    _ windowPoint: NSPoint,
    zoomState: ZoomState,
    screenSize: CGSize
) -> NSPoint {
    let s = zoomState.level.rawValue
    return NSPoint(
        x: (windowPoint.x / s) - zoomState.panOffset.x,
        y: (windowPoint.y / s) - zoomState.panOffset.y
    )
}

/// Convert a capture-space point to window-space.
/// Used to position UI elements at the correct screen location when zoomed.
package func capturePointToWindowPoint(
    _ capturePoint: NSPoint,
    zoomState: ZoomState
) -> NSPoint {
    let s = zoomState.level.rawValue
    return NSPoint(
        x: (capturePoint.x + zoomState.panOffset.x) * s,
        y: (capturePoint.y + zoomState.panOffset.y) * s
    )
}

/// Calculate new pan offset so the cursor position remains fixed on screen
/// when changing zoom level.
package func panOffsetForZoom(
    cursorWindowPoint: NSPoint,
    currentZoom: ZoomState,
    newLevel: ZoomLevel,
    screenSize: CGSize
) -> CGPoint {
    // Find the capture-space point currently under the cursor
    let capturePoint = windowPointToCapturePoint(
        cursorWindowPoint,
        zoomState: currentZoom,
        screenSize: screenSize
    )

    // Solve for new pan offset: windowX = (captureX + panX) * newScale
    // We want windowX = cursorWindowPoint.x
    // So: panX = (cursorWindowPoint.x / newScale) - captureX
    let newScale = newLevel.rawValue
    return CGPoint(
        x: (cursorWindowPoint.x / newScale) - capturePoint.x,
        y: (cursorWindowPoint.y / newScale) - capturePoint.y
    )
}

/// Clamp pan offset so the visible viewport stays within capture bounds.
/// At 1x, viewport equals screen size so offset is clamped to (0, 0).
package func clampPanOffset(
    _ offset: CGPoint,
    zoomLevel: ZoomLevel,
    screenSize: CGSize
) -> CGPoint {
    let s = zoomLevel.rawValue
    let viewportW = screenSize.width / s
    let viewportH = screenSize.height / s

    // Visible capture rect origin = (-panX, -panY), size = (viewportW, viewportH)
    // Clamp so: 0 <= -panX and -panX + viewportW <= screenSize.width
    // Which means: -(screenSize.width - viewportW) <= panX <= 0
    let minPanX = -(screenSize.width - viewportW)
    let minPanY = -(screenSize.height - viewportH)
    return CGPoint(
        x: max(minPanX, min(0, offset.x)),
        y: max(minPanY, min(0, offset.y))
    )
}
