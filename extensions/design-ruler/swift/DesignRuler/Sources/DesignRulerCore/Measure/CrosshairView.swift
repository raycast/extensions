import AppKit
import QuartzCore

/// GPU-composited crosshair using CAShapeLayer.
/// No draw() override — only layer property updates on mouse move.
package final class CrosshairView: NSView {
    package var cursorPosition: NSPoint = .zero
    package var screenFrame: CGRect = .zero

    // Crosshair layers
    private let linesLayer = CAShapeLayer()
    private let leftFoot = CAShapeLayer()
    private let rightFoot = CAShapeLayer()
    private let topFoot = CAShapeLayer()
    private let bottomFoot = CAShapeLayer()

    // Pill (created by PillRenderer factory in setupLayers)
    private var pill: PillRenderer.DimensionPill!

    // Crosshair constants
    private let crossFootHalf: CGFloat = 4.0

    // Pill layout constants
    private let pillHeight = DesignTokens.Pill.height
    private let sectionGap = DesignTokens.Pill.sectionGap
    private let outerRadius = DesignTokens.Pill.cornerRadius
    private let innerRadius = DesignTokens.Pill.innerCornerRadius
    private let labelValueGap: CGFloat = 4
    private let wPadLeft: CGFloat = 8
    private let wPadRight: CGFloat = 6
    private let hPadLeft: CGFloat = 6
    private let hPadRight: CGFloat = 8

    // Pill position state (for swap animation)
    private var pillIsOnLeft = false
    private var pillIsBelow = false

    // Cross-foot colors (difference blend)
    private let lineColor = CGColor(gray: 1.0, alpha: 1.0)
    private let absorbedFootColor = CGColor(srgbRed: 0.29, green: 0.87, blue: 0.50, alpha: 1.0)

    // Font (SF Pro 12px Semibold with OpenType features for values)
    private static let font = PillRenderer.makeDesignFont(size: 12)

    override package init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        setupLayers()
    }

    package required init?(coder: NSCoder) {
        super.init(coder: coder)
        wantsLayer = true
        setupLayers()
    }

    /// Hide all crosshair elements (lines, feet, pill) during drag.
    package func hideForDrag() {
        CATransaction.instant {
            linesLayer.opacity = 0
            leftFoot.opacity = 0
            rightFoot.opacity = 0
            topFoot.opacity = 0
            bottomFoot.opacity = 0
            for pl in pillLayers { pl.opacity = 0 }
        }
    }

    /// Show all crosshair elements after drag ends.
    package func showAfterDrag() {
        CATransaction.instant {
            linesLayer.opacity = 1
            leftFoot.opacity = 1
            rightFoot.opacity = 1
            topFoot.opacity = 1
            bottomFoot.opacity = 1
            for pl in pillLayers { pl.opacity = 1 }
        }
    }

    override package func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        guard let scale = window?.backingScaleFactor else { return }
        // Set contentsScale on ALL layers — shape layers need it for crisp
        // rendering on non-Retina / mixed-DPI displays
        for sl in [linesLayer, leftFoot, rightFoot, topFoot, bottomFoot] {
            sl.contentsScale = scale
        }
        for pl in pill.allLayers {
            pl.contentsScale = scale
        }
    }

    private func setupLayers() {
        guard let root = layer else { return }
        root.masksToBounds = false
        let scale = NSScreen.main?.backingScaleFactor ?? 2.0

        // Crosshair lines — white + difference blend → black on light, white on dark
        linesLayer.strokeColor = lineColor
        linesLayer.lineWidth = 1.0
        linesLayer.fillColor = nil
        linesLayer.compositingFilter = BlendMode.difference
        linesLayer.frame = bounds
        root.addSublayer(linesLayer)

        // Cross-foot ticks — one layer per direction for independent color control
        for foot in [leftFoot, rightFoot, topFoot, bottomFoot] {
            foot.strokeColor = lineColor
            foot.lineWidth = 1.0
            foot.fillColor = nil
            foot.compositingFilter = BlendMode.difference
            foot.frame = bounds
            root.addSublayer(foot)
        }

        // Pill (backgrounds + text layers created by factory)
        pill = PillRenderer.makeDimensionPill(parentLayer: root, scale: scale)
    }

    /// Batch-update cursor + edges. Only updates layer properties (GPU-composited).
    /// `zoomScale` scales visual edge positions so crosshair lines align with the zoomed content.
    /// W×H dimensions always show capture-space (unzoomed) measurements.
    package func update(cursor: NSPoint, edges: DirectionalEdges, zoomScale: CGFloat = 1.0) {
        cursorPosition = cursor

        let cx = cursor.x
        let cy = cursor.y
        let vw = bounds.width
        let vh = bounds.height

        // Capture-space distances (unscaled) for dimension pill
        let leftDist = edges.left?.distance ?? cx
        let rightDist = edges.right?.distance ?? (vw - cx)
        let topDist = edges.top?.distance ?? (vh - cy)
        let bottomDist = edges.bottom?.distance ?? cy

        // Window-space edge positions (scaled by zoom).
        // No clamping — lines extend to real edge positions beyond the viewport.
        // At 1x edges are within viewport. At zoom, off-viewport parts are clipped
        // by the window but revealed during peek pan animations.
        let leftX = edges.left.map { cx - $0.distance * zoomScale } ?? 0
        let rightX = edges.right.map { cx + $0.distance * zoomScale } ?? vw
        let topY = edges.top.map { cy + $0.distance * zoomScale } ?? vh
        let bottomY = edges.bottom.map { cy - $0.distance * zoomScale } ?? 0

        CATransaction.instant {
            // --- Lines path ---
            let path = CGMutablePath()
            path.move(to: CGPoint(x: leftX, y: cy))
            path.addLine(to: CGPoint(x: cx - 1, y: cy))
            path.move(to: CGPoint(x: cx + 1, y: cy))
            path.addLine(to: CGPoint(x: rightX, y: cy))
            path.move(to: CGPoint(x: cx, y: bottomY))
            path.addLine(to: CGPoint(x: cx, y: cy - 1))
            path.move(to: CGPoint(x: cx, y: cy + 1))
            path.addLine(to: CGPoint(x: cx, y: topY))
            linesLayer.path = path

            // --- Cross-feet (absorbed: green, thicker, longer) ---
            let hf = crossFootHalf
            let ahf = crossFootHalf * 1.5  // absorbed feet are 50% longer

            let la = edges.left?.borderAbsorbed ?? false
            let ra = edges.right?.borderAbsorbed ?? false
            let ta = edges.top?.borderAbsorbed ?? false
            let ba = edges.bottom?.borderAbsorbed ?? false

            updateFoot(leftFoot, edge: edges.left, absorbed: la,
                       p1: CGPoint(x: leftX, y: cy - (la ? ahf : hf)),
                       p2: CGPoint(x: leftX, y: cy + (la ? ahf : hf)))
            updateFoot(rightFoot, edge: edges.right, absorbed: ra,
                       p1: CGPoint(x: rightX, y: cy - (ra ? ahf : hf)),
                       p2: CGPoint(x: rightX, y: cy + (ra ? ahf : hf)))
            updateFoot(topFoot, edge: edges.top, absorbed: ta,
                       p1: CGPoint(x: cx - (ta ? ahf : hf), y: topY),
                       p2: CGPoint(x: cx + (ta ? ahf : hf), y: topY))
            updateFoot(bottomFoot, edge: edges.bottom, absorbed: ba,
                       p1: CGPoint(x: cx - (ba ? ahf : hf), y: bottomY),
                       p2: CGPoint(x: cx + (ba ? ahf : hf), y: bottomY))
        }

        // --- Dimension pill (separate transaction for swap animation) ---
        // W×H always shows capture-space (unzoomed) distances
        let w = Int(leftDist + rightDist)
        let h = Int(topDist + bottomDist)

        layoutPill(cx: cx, cy: cy, vw: vw, w: w, h: h)
        updateZoomPillPosition(cursor: cursor)
    }

    // MARK: - Initial pill

    /// Show the pill at cursor position with zero values, fading in.
    package func showInitialPill(at point: NSPoint) {
        cursorPosition = point
        let cx = point.x
        let cy = point.y
        let vw = bounds.width

        // Position and layout with zeros (no actions — set opacity to 0)
        CATransaction.instant {
            for pillLayer in pillLayers { pillLayer.opacity = 0 }
        }

        layoutPill(cx: cx, cy: cy, vw: vw, w: 0, h: 0)

        // Fade in
        CATransaction.animated(duration: DesignTokens.Animation.slow) {
            for pillLayer in pillLayers { pillLayer.opacity = 1 }
        }
    }

    private var pillLayers: [CALayer] {
        pill.allLayers
    }

    // MARK: - Pill layout

    private func layoutPill(cx: CGFloat, cy: CGFloat, vw: CGFloat, w: Int, h: Int) {
        let wLabAttr = PillRenderer.labelText("W")
        let hLabAttr = PillRenderer.labelText("H")
        let wValAttr = PillRenderer.valueText(w)
        let hValAttr = PillRenderer.valueText(h)
        let wLabW = ceil(wLabAttr.size().width)
        let hLabW = ceil(hLabAttr.size().width)
        let wValW = ceil(wValAttr.size().width)
        let hValW = ceil(hValAttr.size().width)
        let textH = ceil(wValAttr.size().height)

        let wSectionW = wPadLeft + wLabW + labelValueGap + wValW + wPadRight
        let hSectionW = hPadLeft + hLabW + labelValueGap + hValW + hPadRight
        let totalPillW = wSectionW + sectionGap + hSectionW

        // Position pill near cursor
        var px = round(cx + 12)
        var py = round(cy - 12 - pillHeight)
        let nowOnLeft = px + totalPillW > vw - 12
        if nowOnLeft { px = round(cx - 12 - totalPillW) }
        let nowBelow = py < 12
        if nowBelow { py = round(cy + 12) }

        // Detect flip
        let flipped = (nowOnLeft != pillIsOnLeft) || (nowBelow != pillIsBelow)
        pillIsOnLeft = nowOnLeft
        pillIsBelow = nowBelow

        let pillBody = {
            let textY = round(py + (self.pillHeight - textH) / 2)

            // W section — set frame for position animation, path at local origin
            let wRect = CGRect(x: px, y: py, width: wSectionW, height: self.pillHeight)
            self.pill.wBgLayer.frame = wRect
            self.pill.wBgLayer.path = PillRenderer.sectionPath(rect: CGRect(origin: .zero, size: wRect.size),
                                         leftRadius: self.outerRadius, rightRadius: self.innerRadius)

            let wLabX = round(wRect.minX + self.wPadLeft)
            self.pill.wLabelLayer.string = wLabAttr
            self.pill.wLabelLayer.frame = CGRect(x: wLabX, y: textY, width: wLabW, height: textH)

            let wValX = round(wLabX + wLabW + self.labelValueGap)
            self.pill.wValueLayer.string = wValAttr
            self.pill.wValueLayer.frame = CGRect(x: wValX, y: textY, width: wValW, height: textH)

            // H section — set frame for position animation, path at local origin
            let hRect = CGRect(x: px + wSectionW + self.sectionGap, y: py, width: hSectionW, height: self.pillHeight)
            self.pill.hBgLayer.frame = hRect
            self.pill.hBgLayer.path = PillRenderer.sectionPath(rect: CGRect(origin: .zero, size: hRect.size),
                                         leftRadius: self.innerRadius, rightRadius: self.outerRadius)

            let hLabX = round(hRect.minX + self.hPadLeft)
            self.pill.hLabelLayer.string = hLabAttr
            self.pill.hLabelLayer.frame = CGRect(x: hLabX, y: textY, width: hLabW, height: textH)

            let hValX = round(hLabX + hLabW + self.labelValueGap)
            self.pill.hValueLayer.string = hValAttr
            self.pill.hValueLayer.frame = CGRect(x: hValX, y: textY, width: hValW, height: textH)
        }

        if flipped {
            CATransaction.animated(duration: DesignTokens.Animation.fast, pillBody)
        } else {
            CATransaction.instant(pillBody)
        }
    }

    // MARK: - Zoom fallback pill

    private var zoomPillBg: CAShapeLayer?
    private var zoomPillText: CATextLayer?
    private var zoomPillWorkItem: DispatchWorkItem?
    private var zoomPillSize: CGSize = .zero

    /// Show a brief zoom level pill near the dimension pill when hint bar is hidden.
    package func showZoomFlash(level: ZoomLevel, at cursor: NSPoint) {
        zoomPillWorkItem?.cancel()
        removeZoomPill()

        let text: String
        switch level {
        case .one:  text = "x1"
        case .two:  text = "x2"
        case .four: text = "x4"
        }

        guard let root = layer else { return }
        let scale = window?.backingScaleFactor ?? 2.0

        // Create text layer
        let textAttr = NSAttributedString(string: text, attributes: [
            .font: PillRenderer.makeDesignFont(size: 12),
            .foregroundColor: NSColor.white,
            .kern: DesignTokens.Pill.kerning,
        ])
        let textSize = textAttr.size()
        let padding: CGFloat = 16
        let pillW = ceil(textSize.width) + padding
        let pillH = DesignTokens.Pill.height
        zoomPillSize = CGSize(width: pillW, height: pillH)

        // Position relative to dimension pill
        let pos = zoomPillPosition(cursor: cursor, pillW: pillW, pillH: pillH)

        // Background layer
        let bg = CAShapeLayer()
        bg.fillColor = DesignTokens.Pill.backgroundColor
        bg.strokeColor = nil
        bg.frame = CGRect(origin: pos, size: CGSize(width: pillW, height: pillH))
        bg.path = PillRenderer.squirclePath(
            rect: CGRect(origin: .zero, size: CGSize(width: pillW, height: pillH)),
            radius: DesignTokens.Pill.cornerRadius
        )
        bg.shadowColor = DesignTokens.Shadow.color
        bg.shadowOffset = DesignTokens.Shadow.offset
        bg.shadowRadius = DesignTokens.Shadow.radius
        bg.shadowOpacity = DesignTokens.Shadow.opacity
        bg.contentsScale = scale
        bg.opacity = 0
        root.addSublayer(bg)

        // Text layer
        let tl = CATextLayer()
        tl.contentsScale = scale
        tl.truncationMode = .none
        tl.isWrapped = false
        tl.alignmentMode = .center
        tl.string = textAttr
        let textY = round(pos.y + (pillH - ceil(textSize.height)) / 2)
        tl.frame = CGRect(x: pos.x, y: textY, width: pillW, height: ceil(textSize.height))
        tl.opacity = 0
        root.addSublayer(tl)

        self.zoomPillBg = bg
        self.zoomPillText = tl

        // Fade in
        CATransaction.animated(duration: DesignTokens.Animation.fast) {
            bg.opacity = 1
            tl.opacity = 1
        }

        // Schedule removal after 0.5s
        let removeItem = DispatchWorkItem { [weak self] in
            self?.fadeAndRemoveZoomPill()
        }
        zoomPillWorkItem = removeItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: removeItem)
    }

    /// Update zoom pill position to follow cursor.
    package func updateZoomPillPosition(cursor: NSPoint) {
        guard let bg = zoomPillBg, let tl = zoomPillText else { return }
        let pillW = zoomPillSize.width
        let pillH = zoomPillSize.height
        let pos = zoomPillPosition(cursor: cursor, pillW: pillW, pillH: pillH)
        CATransaction.instant {
            bg.frame = CGRect(origin: pos, size: CGSize(width: pillW, height: pillH))
            let textH = tl.frame.height
            tl.frame = CGRect(x: pos.x, y: round(pos.y + (pillH - textH) / 2), width: pillW, height: textH)
        }
    }

    private func zoomPillPosition(cursor: NSPoint, pillW: CGFloat, pillH: CGFloat) -> CGPoint {
        let gap: CGFloat = 6
        let dimPillRight = pill.hBgLayer.frame.maxX
        let dimPillLeft = pill.wBgLayer.frame.minX
        var px: CGFloat
        let py = round(cursor.y - 12 - pillH)

        if pillIsOnLeft {
            px = round(dimPillLeft - gap - pillW)
        } else {
            px = round(dimPillRight + gap)
        }

        // Clamp to screen
        let vw = bounds.width
        if px + pillW > vw - 6 { px = round(dimPillLeft - gap - pillW) }
        if px < 6 { px = round(dimPillRight + gap) }

        return CGPoint(x: px, y: py)
    }

    private func fadeAndRemoveZoomPill() {
        guard let bg = zoomPillBg, let tl = zoomPillText else { return }
        CATransaction.animated(duration: DesignTokens.Animation.fast) {
            bg.opacity = 0
            tl.opacity = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + DesignTokens.Animation.fast) { [weak self] in
            self?.removeZoomPill()
        }
    }

    private func removeZoomPill() {
        zoomPillBg?.removeFromSuperlayer()
        zoomPillText?.removeFromSuperlayer()
        zoomPillBg = nil
        zoomPillText = nil
    }

    // MARK: - Foot helper

    private func updateFoot(_ foot: CAShapeLayer, edge: EdgeHit?, absorbed: Bool, p1: CGPoint, p2: CGPoint) {
        guard edge != nil else {
            foot.path = nil
            return
        }
        let path = CGMutablePath()
        path.move(to: p1)
        path.addLine(to: p2)
        foot.path = path
        foot.strokeColor = absorbed ? absorbedFootColor : lineColor
        foot.lineWidth = absorbed ? 2.0 : 1.0
        foot.compositingFilter = absorbed ? nil : BlendMode.difference
    }
}
