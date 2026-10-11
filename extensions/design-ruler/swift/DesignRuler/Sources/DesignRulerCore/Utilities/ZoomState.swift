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

/// Pan offset after the cursor moves from `previous` to `windowPoint`, for 1:1 tracking: the
/// capture point under the cursor is the one it would be over at 1x, so the screen's edges reach
/// the capture's edges. A drag holds the view still and leaves it out of step; the gap then closes
/// in proportion to the distance moved toward the screen edge the cursor heads for, so the view
/// never jumps and is back in step when the cursor gets there. In step, this is plain 1:1 tracking.
package func panOffsetForMove(
    from previous: NSPoint,
    to windowPoint: NSPoint,
    zoomState: ZoomState,
    screenSize: CGSize
) -> CGPoint {
    let s = zoomState.level.rawValue
    let underCursor = windowPointToCapturePoint(previous, zoomState: zoomState, screenSize: screenSize)
    let target = NSPoint(
        x: trackedCapture(underCursor.x, from: previous.x, to: windowPoint.x, length: screenSize.width),
        y: trackedCapture(underCursor.y, from: previous.y, to: windowPoint.y, length: screenSize.height)
    )
    return clampPanOffset(
        CGPoint(x: (windowPoint.x / s) - target.x, y: (windowPoint.y / s) - target.y),
        zoomLevel: zoomState.level,
        screenSize: screenSize
    )
}

/// One axis of `panOffsetForMove`: the capture coordinate under the cursor once it moves from
/// `from` to `to`, given `capture` under it before. Linear from the cursor to the screen edge it
/// moves toward, where window and capture coordinates meet (0 and `length`).
private func trackedCapture(_ capture: CGFloat, from: CGFloat, to: CGFloat, length: CGFloat) -> CGFloat {
    let from = min(max(from, 0), length)
    let to = min(max(to, 0), length)
    if to < from { return capture * to / from }
    if to > from { return length - (length - capture) * (length - to) / (length - from) }
    return capture
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
