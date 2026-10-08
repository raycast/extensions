import AppKit

/// Centralized cursor state machine for both Measure and Alignment Guides.
///
/// Uses NSCursor.set() instead of push/pop because borderless overlay windows
/// override pushed cursors via cursor rect management. OverlayWindow's tracking
/// area includes `.cursorUpdate`, and its `cursorUpdate(with:)` override calls
/// `applyCursor()` — the standard pattern for borderless overlays to maintain
/// the correct cursor without relying on cursor rects.
///
/// Measure:  idle ─hide()─▶ hidden ◀─transitionBack()─ pointingHand / crosshairDrag
/// Guides: idle ─showResize()─▶ resize ◀─transitionBack()─ pointingHand
package final class CursorManager {
    package static let shared = CursorManager()

    package enum State {
        case idle          // Default state, no cursor modifications active
        case hidden        // Measure: cursor hidden, CAShapeLayer crosshair renders
        case resize        // Guides: resize cursor (left-right or up-down)
        case pointingHand  // Hovering a selection/guide line
        case crosshairDrag // During drag-to-select (Measure only)
    }

    package private(set) var state: State = .idle
    private var hideCount: Int = 0

    /// The base state to return to via transitionBack().
    /// Set by hide() (→ .hidden) or showResize() (→ .resize).
    private var baseState: State = .idle

    /// The current resize cursor, tracked so transitionBack() can restore it.
    private var resizeCursor: NSCursor = .resizeLeftRight

    private init() {}

    // MARK: - Launch

    /// Hide cursor at launch. Called once from MeasureWindow.showInitialState().
    /// Sets base state to .hidden for Measure mode.
    package func hide() {
        guard state == .idle else { return }
        NSCursor.hide()
        hideCount += 1
        state = .hidden
        baseState = .hidden
    }

    /// Show a resize cursor at launch. Called from AlignmentGuidesWindow.showInitialState().
    /// Sets base state to .resize for Guides mode.
    package func showResize(_ cursor: NSCursor) {
        guard state == .idle else { return }
        resizeCursor = cursor
        state = .resize
        baseState = .resize
        cursor.set()
    }

    /// Swap the resize cursor (e.g., on Tab direction toggle).
    /// Stores the cursor for transitionBack() even if not currently in .resize state.
    package func updateResize(_ cursor: NSCursor) {
        resizeCursor = cursor
        if state == .resize {
            cursor.set()
        }
    }

    // MARK: - Transitions

    /// Hover selection/guide line: show pointing hand cursor.
    /// Works from both .hidden (Measure) and .resize (Guides) base states.
    package func transitionToPointingHand() {
        switch state {
        case .hidden:
            NSCursor.unhide()
            hideCount = max(hideCount - 1, 0)
            state = .pointingHand
            NSCursor.pointingHand.set()
        case .resize:
            state = .pointingHand
            NSCursor.pointingHand.set()
        default:
            break
        }
    }

    /// Start drag: show system crosshair cursor. Measure only.
    package func transitionToCrosshairDrag() {
        guard state == .hidden else { return }
        NSCursor.unhide()
        hideCount = max(hideCount - 1, 0)
        state = .crosshairDrag
        NSCursor.crosshair.set()
    }

    /// Return to base state from any transient state.
    /// Returns to .hidden (Measure) or .resize (Guides) depending on which launch method was used.
    package func transitionBack() {
        switch state {
        case .pointingHand, .crosshairDrag:
            if baseState == .hidden {
                NSCursor.hide()
                hideCount += 1
                state = .hidden
            } else if baseState == .resize {
                state = .resize
                resizeCursor.set()
            }
        default:
            break
        }
    }

    // MARK: - Apply

    /// Re-apply the current cursor. Called from `cursorUpdate(with:)` in
    /// OverlayWindow to override any system cursor resets.
    package func applyCursor() {
        switch state {
        case .idle: break
        case .hidden: break
        case .resize: resizeCursor.set()
        case .pointingHand: NSCursor.pointingHand.set()
        case .crosshairDrag: NSCursor.crosshair.set()
        }
    }

    // MARK: - Cleanup

    /// Unconditional cleanup for all exit paths.
    /// Unhides all hidden levels and resets to arrow cursor.
    package func restore() {
        for _ in 0..<hideCount {
            NSCursor.unhide()
        }
        hideCount = 0
        NSCursor.arrow.set()
        state = .idle
        baseState = .idle
    }

}
