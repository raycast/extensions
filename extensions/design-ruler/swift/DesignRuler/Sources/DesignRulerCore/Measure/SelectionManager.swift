import AppKit
import QuartzCore

/// Manages the collection of active selection overlays and the drag lifecycle.
/// All input coordinates (startDrag, updateDrag, endDrag, hitTest, updateHover)
/// are in capture-space. MeasureWindow converts from window-space before calling.
package final class SelectionManager {
    package private(set) var selections: [SelectionOverlay] = []
    private let parentLayer: CALayer
    private let edgeDetector: EdgeDetector
    private let scale: CGFloat

    /// Current zoom state — updated on every mouse move and zoom toggle.
    package var zoomState = ZoomState()

    // Drag state (capture-space)
    private var captureOrigin: CGPoint?
    private var liveSelection: SelectionOverlay?

    package init(parentLayer: CALayer, edgeDetector: EdgeDetector, scale: CGFloat) {
        self.parentLayer = parentLayer
        self.edgeDetector = edgeDetector
        self.scale = scale
    }

    // MARK: - Drag lifecycle

    /// Start drag at a capture-space point. Creates a live selection overlay.
    package func startDrag(at point: CGPoint) {
        captureOrigin = point
        let captureRect = CGRect(origin: point, size: .zero)
        let sel = SelectionOverlay(captureRect: captureRect, zoomState: zoomState, parentLayer: parentLayer, scale: scale)
        liveSelection = sel
    }

    /// Update drag to a capture-space point. Renders the live selection at current zoom.
    package func updateDrag(to point: CGPoint) {
        guard let origin = captureOrigin, let sel = liveSelection else { return }
        let captureRect = rectFromPoints(origin, point)
        // Update captureRect and render at current zoom
        sel.captureRect = captureRect
        let s = zoomState.level.rawValue
        let windowRect = CGRect(
            x: (captureRect.origin.x + zoomState.panOffset.x) * s,
            y: (captureRect.origin.y + zoomState.panOffset.y) * s,
            width: captureRect.width * s,
            height: captureRect.height * s
        )
        sel.updateRect(windowRect, animated: false)
    }

    /// End drag and attempt to snap. Returns true if snap succeeded.
    /// `point` is in capture-space. `screenBounds` is the screen's AppKit frame.
    package func endDrag(at point: CGPoint, screenBounds: CGRect) -> Bool {
        guard let origin = captureOrigin, let sel = liveSelection else { return false }
        let dragRect = rectFromPoints(origin, point)
        captureOrigin = nil
        liveSelection = nil

        // Minimum drag distance check (in capture-space points)
        guard dragRect.width >= 4, dragRect.height >= 4 else {
            sel.remove(animated: false)
            return false
        }

        // Attempt snap via edge detection — snapSelection expects window-local AppKit coords.
        // At 1x, capture-space == window-local. At zoom, capture-space IS the unzoomed window-local
        // coords, which is exactly what snapSelection needs (it internally converts to screen AppKit).
        if let snapped = edgeDetector.snapSelection(windowRect: dragRect, screenBounds: screenBounds) {
            // Truncate like the crosshair pill. On Retina a size can end in .5: a browser draws an
            // 80.4px button as 161 device pixels. Rounding showed 81 where hovering it showed 80
            let w = Int(snapped.width)
            let h = Int(snapped.height)
            sel.animateSnap(to: snapped, w: w, h: h, zoomState: zoomState)
            selections.append(sel)
            return true
        } else {
            sel.shakeAndRemove()
            return false
        }
    }

    /// Cancel an in-progress drag without snapping.
    package func cancelDrag() {
        captureOrigin = nil
        if let sel = liveSelection {
            sel.remove(animated: false)
            liveSelection = nil
        }
    }

    // MARK: - Hit testing & hover (capture-space)

    package func hitTest(_ point: CGPoint) -> SelectionOverlay? {
        selections.reversed().first { $0.contains(point) }
    }

    package func updateHover(at point: CGPoint) {
        let hovered = hitTest(point)
        for sel in selections {
            sel.setHovered(sel === hovered)
        }
    }

    // MARK: - Zoom

    /// Update all finalized selections for a new zoom state.
    /// Called from MeasureWindow.zoomDidChange() after zoom toggle or pan update.
    package func updateZoom(_ newZoomState: ZoomState) {
        zoomState = newZoomState
        for sel in selections {
            sel.updateForZoom(zoomState: newZoomState)
        }
    }

    // MARK: - Removal

    package func removeSelection(_ selection: SelectionOverlay) {
        selection.remove(animated: true)
        selections.removeAll { $0 === selection }
    }

    package func clearAll() {
        for sel in selections {
            sel.remove(animated: true)
        }
        selections.removeAll()
    }

    package var hasSelections: Bool { !selections.isEmpty }
    package var isDragging: Bool { captureOrigin != nil }

    // MARK: - Helpers

    private func rectFromPoints(_ a: CGPoint, _ b: CGPoint) -> CGRect {
        CGRect(x: min(a.x, b.x), y: min(a.y, b.y),
               width: abs(a.x - b.x), height: abs(a.y - b.y))
    }
}
