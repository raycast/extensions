import AppKit
import QuartzCore

/// Manages the preview line and collection of placed guide lines.
package final class GuideLineManager {
    private let previewLine: GuideLine
    private var placedLines: [GuideLine] = []

    private var currentDirection: Direction = .vertical
    private var currentStyle: GuideLineStyle = .dynamic

    private let parentLayer: CALayer
    private let scale: CGFloat
    private let screenSize: CGSize

    // Zoom state (set via updateForZoom only)
    private var zoomState = ZoomState()

    /// Extract the window-space coordinate along the guide axis (perpendicular to the line).
    private func alongAxis(_ point: NSPoint) -> CGFloat {
        currentDirection == .vertical ? point.y : point.x
    }

    // Current preview state (for placing) — capture-space
    private var currentPosition: CGFloat = 0
    private var currentCursorAlongAxis: CGFloat = 0

    // Hover state
    package private(set) var hoveredLine: GuideLine? = nil

    // Color indicator
    private var colorIndicator: ColorCircleIndicator?

    package init(parentLayer: CALayer, scale: CGFloat, screenSize: CGSize) {
        self.parentLayer = parentLayer
        self.scale = scale
        self.screenSize = screenSize

        // Create preview line
        self.previewLine = GuideLine(
            direction: .vertical,
            position: 0,
            style: .dynamic,
            isPreview: true,
            parentLayer: parentLayer,
            scale: scale
        )
    }

    /// Update preview line position to follow cursor.
    /// `capturePoint` is in capture-space (caller converts). `windowPoint` is in window-space for color indicator.
    package func updatePreview(capturePoint: NSPoint, windowPoint: NSPoint) {
        let position: CGFloat
        let cursorAlongAxis: CGFloat

        if currentDirection == .vertical {
            position = capturePoint.x
            cursorAlongAxis = capturePoint.y
        } else {
            position = capturePoint.y
            cursorAlongAxis = capturePoint.x
        }

        currentPosition = position
        currentCursorAlongAxis = cursorAlongAxis

        previewLine.update(
            capturePosition: position,
            cursorAlongAxis: alongAxis(windowPoint),
            screenSize: screenSize,
            direction: currentDirection,
            style: currentStyle,
            zoomState: zoomState
        )

        // Follow cursor with color indicator (window-space)
        colorIndicator?.updatePosition(at: windowPoint, screenSize: screenSize)

        // Hide pill when color indicator is showing
        if colorIndicator?.isVisible == true && !previewLine.isInRemoveMode {
            previewLine.hidePill()
        }
    }

    /// Place a guide line at the current preview position.
    package func placeGuide() {
        let newLine = GuideLine(
            direction: currentDirection,
            position: currentPosition,
            style: currentStyle,
            isPreview: false,
            parentLayer: parentLayer,
            scale: scale
        )

        // Update position immediately
        newLine.update(
            capturePosition: currentPosition,
            cursorAlongAxis: currentCursorAlongAxis,
            screenSize: screenSize,
            direction: currentDirection,
            style: currentStyle,
            zoomState: zoomState
        )

        // Fade in
        newLine.setOpacity(0, animated: false)
        newLine.setOpacity(1, animated: true)

        placedLines.append(newLine)
    }

    /// Toggle preview direction between vertical and horizontal.
    /// `windowPoint` is needed to compute the window-space cursor-along-axis for pill positioning.
    package func toggleDirection(windowPoint: NSPoint) {
        currentDirection = currentDirection.toggled()

        // Swap axes: vertical position=x, along=y; horizontal position=y, along=x
        swap(&currentPosition, &currentCursorAlongAxis)

        previewLine.update(
            capturePosition: currentPosition,
            cursorAlongAxis: alongAxis(windowPoint),
            screenSize: screenSize,
            direction: currentDirection,
            style: currentStyle,
            zoomState: zoomState
        )
    }

    /// Cycle to next style preset with color indicator.
    /// `windowPoint` is in window-space for color indicator positioning.
    package func cycleStyle(windowPoint: NSPoint) {
        currentStyle = currentStyle.next()
        let styleIndex = GuideLineStyle.allCases.firstIndex(of: currentStyle)!

        // Update preview line to new color
        previewLine.update(
            capturePosition: currentPosition,
            cursorAlongAxis: alongAxis(windowPoint),
            screenSize: screenSize,
            direction: currentDirection,
            style: currentStyle,
            zoomState: zoomState
        )

        // Show/update color indicator (window-space)
        if colorIndicator == nil {
            colorIndicator = ColorCircleIndicator(parentLayer: parentLayer, scale: scale, screenSize: screenSize)
        }
        colorIndicator!.show(at: windowPoint, activeIndex: styleIndex, screenSize: screenSize)
        previewLine.hidePill()
    }

    /// Get current direction for cursor management.
    package var direction: Direction {
        currentDirection
    }

    /// Get current style index for color indicator.
    private var currentStyleIndex: Int {
        GuideLineStyle.allCases.firstIndex(of: currentStyle)!
    }

    /// Set preview line style (for global color sync across multi-monitor).
    package func setPreviewStyle(_ style: GuideLineStyle) {
        currentStyle = style
    }

    /// Set preview line direction (for global direction sync across multi-monitor).
    package func setDirection(_ direction: Direction) {
        currentDirection = direction
    }

    /// Get current style value (for propagating to coordinator).
    package var currentStyleValue: GuideLineStyle {
        currentStyle
    }

    /// Check for hover over placed lines.
    package var hasHoveredLine: Bool {
        hoveredLine != nil
    }

    /// Update hover state based on cursor position (capture-space).
    package func updateHover(at point: NSPoint) {
        // 5px threshold in screen-space → divide by zoom scale for capture-space comparison
        let threshold = 5.0 / zoomState.level.rawValue
        let newHovered = findNearestLine(to: point, within: threshold)

        if newHovered !== hoveredLine {
            // Unhover old line
            hoveredLine?.setHovered(false, cursorPosition: point)

            // Hover new line
            newHovered?.setHovered(true, cursorPosition: point)

            hoveredLine = newHovered

            // Toggle preview line mode: hide line + show "Remove" pill when hovering
            previewLine.isInRemoveMode = (newHovered != nil)
            previewLine.setLineVisible(newHovered == nil)
        }
    }

    /// Find nearest placed line to point within threshold (both in capture-space).
    private func findNearestLine(to point: NSPoint, within threshold: CGFloat) -> GuideLine? {
        var nearest: GuideLine? = nil
        var minDistance = threshold

        for line in placedLines {
            let distance: CGFloat
            if line.direction == .vertical {
                distance = abs(point.x - line.capturePosition)
            } else {
                distance = abs(point.y - line.capturePosition)
            }

            if distance < minDistance {
                minDistance = distance
                nearest = line
            }
        }

        return nearest
    }

    /// Remove a placed line immediately.
    package func removeLine(_ line: GuideLine) {
        line.remove(animated: false)
        placedLines.removeAll { $0 === line }
        hoveredLine = nil
    }

    /// Reset preview line state after a removal.
    package func resetRemoveMode() {
        previewLine.isInRemoveMode = false
        previewLine.setLineVisible(true)
    }

    /// Hide preview line and pill (for multi-monitor deactivation).
    package func hidePreview() {
        previewLine.setLineVisible(false)
        previewLine.hidePill()
    }

    /// Show preview line (for multi-monitor activation).
    package func showPreview() {
        previewLine.setLineVisible(true)
    }

    /// Reposition all lines after zoom/pan change.
    package func updateForZoom(_ newZoomState: ZoomState) {
        zoomState = newZoomState

        // Reposition preview line — derive window-space cursor-along-axis from capture-space
        let capturePt = NSPoint(
            x: currentDirection == .vertical ? currentPosition : currentCursorAlongAxis,
            y: currentDirection == .vertical ? currentCursorAlongAxis : currentPosition
        )
        let windowPt = capturePointToWindowPoint(capturePt, zoomState: zoomState)

        previewLine.update(
            capturePosition: currentPosition,
            cursorAlongAxis: alongAxis(windowPt),
            screenSize: screenSize,
            direction: currentDirection,
            style: currentStyle,
            zoomState: zoomState
        )

        // Reposition all placed lines
        for line in placedLines {
            line.updateRenderPosition(zoomState: zoomState, screenSize: screenSize)
        }
    }
}
