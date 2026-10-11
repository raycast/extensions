import AppKit
import QuartzCore

/// Launch animation: a wave of grid marks spreads from the cursor across the frozen screenshot, with
/// a soft halo near its front, a light wash across the band and a line at the front: dots for
/// Measure, hairline grid lines for Alignment Guides. Tuned in the browser prototype (Grid Wave Tuner).
///
/// Core Animation only: a small pre-drawn tile of marks, repeated across the screen by replicator layers
/// and revealed by radial gradient masks whose stops move outward, grouped under the crosshair's
/// difference blend so it shows on light and dark backgrounds. The render server drives every
/// frame: nothing runs on the main thread during the wave, and nothing screen-sized has to be drawn,
/// compiled or uploaded before it can start.
///
/// CAGradientLayer draws its ramp in 256 steps, so across a screen-sized radius a gradient edge is
/// 10-20pt soft. The gradients only shape the gentle falloff behind the front; the hard front is a
/// circle mask on the group and the front line is a stroked circle, both vector-sharp.
///
/// Every animation keeps changing until it is removed: on macOS 27 an attached animation that holds
/// a value stops the built-in ProMotion display from showing new frames (CLAUDE.md section 18). So
/// the timeline starts once the front has left the origin (`Geometry.startProgress`), and the
/// fade-in is a separate short animation.
package final class LaunchWave {
    /// The grid's marks: dots for Measure, lines for Alignment Guides.
    package enum Style {
        case dots
        case lines
    }

    private let style: Style
    private let container = CALayer()
    private var isFinished = false

    package init(style: Style) {
        self.style = style
    }

    /// Start the wave inside `contentLayer` (screen-sized, y up). `origin` is the cursor in the same
    /// coordinates. It may lie outside the screen: the wave then sweeps in from that side.
    package func start(in contentLayer: CALayer, origin: CGPoint, scale: CGFloat) {
        let size = contentLayer.bounds.size
        guard size.width > 0, size.height > 0,
              let markTile = Tile.image(style, scale: scale, halo: false),
              let haloTile = Tile.image(style, scale: scale, halo: true) else { return }
        let bounds = CGRect(origin: .zero, size: size)
        let geometry = Geometry(origin: origin, size: size)
        let start = geometry.startProgress(minFront: Self.minFront)
        let duration = DesignTokens.Animation.launchWave * Double(1 - start)
        // Front radius per keyframe, sampled at 60fps with the easing baked in, so every keyframe
        // differs from the last
        let frames = max(2, Int((duration * 60).rounded()))
        let fronts = (0...frames).map { k -> CGFloat in
            let t = start + (1 - start) * CGFloat(k) / CGFloat(frames)
            return geometry.front(1 - pow(1 - t, 3))  // easeOut cubic, as tuned
        }

        // One transaction for every animation: its completion block waits only for animations added
        // after it is set
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        CATransaction.setCompletionBlock { [weak self] in self?.finish() }

        container.frame = bounds
        container.compositingFilter = BlendMode.difference
        // The clip sits half a pixel past the front line's outer edge so it doesn't shave the line's antialiasing
        let clip = Look.ringWidth / 2 + 0.5 / scale
        container.mask = circle(fill: true, offset: clip, fronts: fronts, center: origin, bounds: bounds, duration: duration)

        let wash = band(Self.bandStops { Look.wash * Self.profile($0) }, fronts: fronts, geometry: geometry, bounds: bounds, duration: duration)

        let halo = CALayer()
        halo.frame = bounds
        halo.addSublayer(tiled(haloTile, scale: scale, nearest: false, bounds: bounds))
        halo.mask = band(Self.bandStops { Self.profile($0) * (0.35 + 0.65 * Self.frontPeak($0)) },
                         fronts: fronts, geometry: geometry, bounds: bounds, duration: duration)

        let marks = CALayer()
        marks.frame = bounds
        marks.addSublayer(tiled(markTile, scale: scale, nearest: true, bounds: bounds))
        marks.mask = band(Self.bandStops { Self.profile($0) }, fronts: fronts, geometry: geometry, bounds: bounds, duration: duration)

        let ring = circle(fill: false, offset: 0, fronts: fronts, center: origin, bounds: bounds, duration: duration)

        for layer in [wash, halo, marks, ring] { container.addSublayer(layer) }
        if start < Look.fadeIn {
            let fade = CABasicAnimation(keyPath: "opacity")
            fade.fromValue = start / Look.fadeIn
            fade.toValue = 1
            fade.duration = DesignTokens.Animation.launchWave * Double(Look.fadeIn - start)
            container.add(fade, forKey: "fadeIn")
        }
        contentLayer.addSublayer(container)
        CATransaction.commit()
    }

    /// Remove the wave immediately (exit, or a new wave replacing this one).
    package func cancel() {
        finish()
    }

    private func finish() {
        guard !isFinished else { return }
        isFinished = true
        CATransaction.instant { container.removeFromSuperlayer() }
    }

    // MARK: - Look

    /// Values picked in the browser prototype (the line alphas give the hairline grid about the
    /// same visual weight as the dots).
    fileprivate enum Look {
        static let spacing: CGFloat = 12       // pt between marks
        static let majorEvery = 8              // every 8th mark across and down is a major one
        static let dotSize: CGFloat = 1.5      // pt; major dots are twice as big
        static let dotAlpha: (minor: CGFloat, major: CGFloat) = (0.5, 1)
        static let lineAlpha: (minor: CGFloat, major: CGFloat) = (0.3, 0.8)  // one device pixel wide
        static let bandWidth: CGFloat = 0.4    // share of the distance across the screen
        static let hold: CGFloat = 0.3         // share of the band at full strength behind the front
        static let trailFade: CGFloat = 1.5    // fade exponent behind the hold
        static let frontGlow: CGFloat = 0.3
        static let haloSigma: CGFloat = 3      // pt, Gaussian halo around each mark
        static let wash: CGFloat = 0.2         // shading across the band, between the marks
        static let ringWidth: CGFloat = 1      // pt, the line at the front
        static let fadeIn: CGFloat = 0.08      // share of the duration
    }

    /// Strength across the band. x is the distance from the front in band widths (negative = behind it).
    private static func profile(_ x: CGFloat) -> CGFloat {
        let base = x >= -Look.hold ? 1 : pow(max(0, (1 + x) / (1 - Look.hold)), Look.trailFade)
        return min(1, (1 - 0.6 * Look.frontGlow) * base + Look.frontGlow * exp(-x * x / 0.0036))
    }

    /// Weight that favors the last tenth of the band, for the halo.
    private static func frontPeak(_ x: CGFloat) -> CGFloat {
        exp(-x * x / 0.01)
    }

    // MARK: - Layers

    /// A screen-sized layer repeating `tile` from the top-left corner, like the prototype's grid.
    private func tiled(_ tile: CGImage, scale: CGFloat, nearest: Bool, bounds: CGRect) -> CALayer {
        let side = Tile.side
        let piece = CALayer()
        piece.frame = CGRect(x: 0, y: bounds.height - side, width: side, height: side)
        piece.contents = tile
        piece.contentsScale = scale
        piece.contentsGravity = .resize
        if nearest { piece.magnificationFilter = .nearest }  // crisp marks when zoomed

        let row = CAReplicatorLayer()
        row.frame = bounds
        row.instanceCount = max(1, Int((bounds.width / side).rounded(.up)))
        row.instanceTransform = CATransform3DMakeTranslation(side, 0, 0)
        row.addSublayer(piece)

        let grid = CAReplicatorLayer()
        grid.frame = bounds
        grid.instanceCount = max(1, Int((bounds.height / side).rounded(.up)))
        grid.instanceTransform = CATransform3DMakeTranslation(0, -side, 0)
        grid.addSublayer(row)
        return grid
    }

    /// Gradient stops: stop i sits `xs[i]` band widths behind the front (the band width is set per
    /// screen) with alpha `alphas[i]`.
    private struct BandStops {
        let xs: [CGFloat]
        let alphas: [CGFloat]
    }

    private static let samples = 32
    private static let minFront: CGFloat = 0.5   // pt: the front's radius at the first keyframe

    /// Stops across the band, denser near the front where the glow peaks, plus one on the hold's
    /// edge. Past the last stop the gradient keeps the front's strength; the circle mask cuts it off.
    private static func bandStops(_ strength: (CGFloat) -> CGFloat) -> BandStops {
        let xs = ((0...samples).map { i -> CGFloat in
            let u = 1 - CGFloat(i) / CGFloat(samples)
            return -u * u
        } + [-Look.hold]).sorted()
        return BandStops(xs: xs, alphas: xs.map(strength))
    }

    /// A radial gradient band centered on the origin whose stops travel outward with the front.
    private func band(_ stops: BandStops, fronts: [CGFloat], geometry g: Geometry, bounds: CGRect,
                      duration: CFTimeInterval) -> CAGradientLayer {
        let layer = CAGradientLayer()
        layer.type = .radial
        layer.frame = bounds
        let center = CGPoint(x: g.origin.x / bounds.width, y: g.origin.y / bounds.height)
        layer.startPoint = center
        layer.endPoint = CGPoint(x: center.x + g.maxRadius / bounds.width, y: center.y + g.maxRadius / bounds.height)
        layer.colors = stops.alphas.map { CGColor(gray: 1, alpha: $0) }
        let values: [[NSNumber]] = fronts.map { front in
            stops.xs.map { NSNumber(value: Double(min(1, max(0, (front + $0 * g.width) / g.maxRadius)))) }
        }
        layer.locations = values.last
        let animation = CAKeyframeAnimation(keyPath: "locations")
        animation.values = values
        animation.duration = duration
        animation.calculationMode = .linear
        layer.add(animation, forKey: "wave")
        return layer
    }

    /// A circle `offset` past the front that grows with it: filled for the mask, stroked for the line.
    private func circle(fill: Bool, offset: CGFloat, fronts: [CGFloat], center: CGPoint, bounds: CGRect,
                        duration: CFTimeInterval) -> CAShapeLayer {
        let layer = CAShapeLayer()
        layer.frame = bounds
        let white = CGColor(gray: 1, alpha: 1)
        if fill {
            layer.fillColor = white
        } else {
            layer.fillColor = nil
            layer.strokeColor = white
            layer.lineWidth = Look.ringWidth
        }
        let paths = fronts.map { front -> CGPath in
            let r = max(0.01, front + offset)
            let path = CGMutablePath()
            if fill {
                // Zero-length subpaths at two opposite screen corners keep the mask's bounding box
                // screen-sized from the first frame. Otherwise the render server sizes the group's
                // offscreen to the growing circle and reallocates it on the way to full screen, which
                // on two Retina screens costs 1-2 missed frames a quarter second in. They fill
                // nothing, and every keyframe keeps the same elements, so the path still interpolates.
                for corner in [CGPoint(x: bounds.minX, y: bounds.minY), CGPoint(x: bounds.maxX, y: bounds.maxY)] {
                    path.move(to: corner)
                    path.addLine(to: corner)
                }
            }
            path.addEllipse(in: CGRect(x: center.x - r, y: center.y - r, width: 2 * r, height: 2 * r))
            return path
        }
        layer.path = paths.last
        let animation = CAKeyframeAnimation(keyPath: "path")
        animation.values = paths
        animation.duration = duration
        animation.calculationMode = .linear
        layer.add(animation, forKey: "wave")
        return layer
    }

    /// Where the wave starts and how far it travels, in the content layer's coordinates.
    private struct Geometry {
        let origin: CGPoint
        let near: CGFloat  // distance to the screen, 0 when the origin is on it
        let span: CGFloat  // from `near` to the farthest corner

        init(origin: CGPoint, size: CGSize) {
            self.origin = origin
            let dx = max(0, -origin.x, origin.x - size.width)
            let dy = max(0, -origin.y, origin.y - size.height)
            near = hypot(dx, dy)
            let far = [CGPoint.zero, CGPoint(x: size.width, y: 0), CGPoint(x: 0, y: size.height),
                       CGPoint(x: size.width, y: size.height)]
                .map { hypot($0.x - origin.x, $0.y - origin.y) }.max() ?? 0
            span = max(1, far - near)
        }

        var width: CGFloat { Look.bandWidth * span }

        /// Front radius at eased progress e. It starts just behind the point of the screen nearest
        /// the origin, and the band's tail reaches the farthest corner at e = 1.
        func front(_ e: CGFloat) -> CGFloat {
            near - 0.3 * width + (span + 1.3 * width) * e
        }

        var maxRadius: CGFloat { front(1) + 2 }

        /// Progress at which the front has moved `minFront` past the origin. Before it every gradient
        /// stop sits clamped at the center, so the locations would hold still.
        func startProgress(minFront: CGFloat) -> CGFloat {
            let e = (minFront - front(0)) / (span + 1.3 * width)
            guard e > 0 else { return 0 }
            return 1 - pow(1 - min(0.99, e), 1.0 / 3)  // inverse of easeOut cubic
        }
    }
}

/// One repeat of the grid: `majorEvery` × `majorEvery` cells with the major mark at the top-left
/// corner. Replicator layers repeat it across the screen, so nothing screen-sized is drawn or copied
/// to the render server.
private enum Tile {
    typealias Look = LaunchWave.Look

    /// Side of one repeat, in points.
    static let side = Look.spacing * CGFloat(Look.majorEvery)

    /// The marks, or their halo (Gaussian blur), at `scale` pixels per point.
    static func image(_ style: LaunchWave.Style, scale: CGFloat, halo: Bool) -> CGImage? {
        let sidePx = (side * scale).rounded()
        guard let ctx = context(side: Int(sidePx)) else { return nil }
        ctx.clear(CGRect(x: 0, y: 0, width: sidePx, height: sidePx))
        switch style {
        case .dots: drawDots(in: ctx, scale: scale, sidePx: sidePx, halo: halo)
        case .lines: drawLines(in: ctx, scale: scale, sidePx: sidePx, halo: halo)
        }
        return ctx.makeImage()
    }

    private static let white = CGColor(gray: 1, alpha: 1)

    private static func drawDots(in ctx: CGContext, scale: CGFloat, sidePx: CGFloat, halo: Bool) {
        let cell = Look.spacing * scale
        // Majors are twice the rounded minor size, and the halo blurs the pixels actually drawn
        let minorPx = max(1, (Look.dotSize * scale).rounded())
        for i in 0..<Look.majorEvery {
            for j in 0..<Look.majorEvery {
                let major = i == 0 && j == 0
                let px = major ? 2 * minorPx : minorPx
                let alpha = major ? Look.dotAlpha.major : Look.dotAlpha.minor
                // CG is y up: row j counts down from the top edge. Dots on an edge wrap around
                for dx in [-sidePx, 0, sidePx] {
                    for dy in [-sidePx, 0, sidePx] {
                        let center = CGPoint(x: CGFloat(i) * cell + dx, y: sidePx - CGFloat(j) * cell + dy)
                        if halo {
                            drawDotHalo(in: ctx, at: center, dotPt: px / scale, alpha: alpha, scale: scale)
                        } else {
                            ctx.setFillColor(white.copy(alpha: alpha) ?? white)
                            ctx.fill(CGRect(x: center.x - floor(px / 2), y: center.y - floor(px / 2), width: px, height: px))
                        }
                    }
                }
            }
        }
    }

    /// One-pixel lines on every cell edge; the first column and row are the major ones. Each pass is
    /// composited as one layer, so crossings within it don't double up; a major line stacks over the
    /// minor ones it crosses (like the prototype).
    private static func drawLines(in ctx: CGContext, scale: CGFloat, sidePx: CGFloat, halo: Bool) {
        let cell = Look.spacing * scale
        for major in [false, true] {
            let alpha = major ? Look.lineAlpha.major : Look.lineAlpha.minor
            let indices = major ? [0] : Array(1..<Look.majorEvery)
            if halo {
                // Lines on an edge wrap around
                for i in indices {
                    for shift in [-sidePx, 0, sidePx] {
                        drawLineHalo(in: ctx, at: CGFloat(i) * cell + 0.5 + shift, vertical: true, alpha: alpha, scale: scale)
                        drawLineHalo(in: ctx, at: sidePx - CGFloat(i) * cell - 0.5 + shift, vertical: false, alpha: alpha, scale: scale)
                    }
                }
                continue
            }
            ctx.saveGState()
            ctx.setAlpha(alpha)
            ctx.beginTransparencyLayer(auxiliaryInfo: nil)
            ctx.setFillColor(white)
            for i in indices {
                // CG is y up: row i counts down from the top edge
                ctx.fill(CGRect(x: CGFloat(i) * cell, y: 0, width: 1, height: sidePx))
                ctx.fill(CGRect(x: 0, y: sidePx - CGFloat(i) * cell - 1, width: sidePx, height: 1))
            }
            ctx.endTransparencyLayer()
            ctx.restoreGState()
        }
    }

    /// Gaussian falloff with `alpha` at `peak` times the coverage, out to three sigmas, applied
    /// twice for a brighter halo.
    private static func haloGradient(peak: CGFloat, symmetric: Bool) -> CGGradient? {
        let steps = 10
        var components: [CGFloat] = []
        var locations: [CGFloat] = []
        for k in 0...steps {
            let u = CGFloat(k) / CGFloat(steps)
            let sigmas = symmetric ? 6 * u - 3 : 3 * u  // -3...3 across a line, 0...3 out of a dot
            let a = peak * exp(-sigmas * sigmas / 2)
            components += [1, 1, 1, 1 - (1 - a) * (1 - a)]
            locations.append(u)
        }
        guard let space = CGColorSpace(name: CGColorSpace.sRGB) else { return nil }
        return CGGradient(colorSpace: space, colorComponents: components, locations: locations, count: locations.count)
    }

    /// A blurred dot: the same total coverage as the square it blurs.
    private static func drawDotHalo(in ctx: CGContext, at center: CGPoint, dotPt: CGFloat, alpha: CGFloat, scale: CGFloat) {
        let sigma = Look.haloSigma
        guard let gradient = haloGradient(peak: alpha * dotPt * dotPt / (2 * .pi * sigma * sigma), symmetric: false) else { return }
        ctx.drawRadialGradient(gradient, startCenter: center, startRadius: 0, endCenter: center,
                               endRadius: 3 * sigma * scale, options: [])
    }

    /// A blurred one-pixel line: the same total coverage across it, the full length of the tile.
    private static func drawLineHalo(in ctx: CGContext, at position: CGFloat, vertical: Bool, alpha: CGFloat, scale: CGFloat) {
        let sigma = Look.haloSigma
        guard let gradient = haloGradient(peak: alpha * (1 / scale) / (sqrt(2 * .pi) * sigma), symmetric: true) else { return }
        let reach = 3 * sigma * scale
        let (start, end) = vertical
            ? (CGPoint(x: position - reach, y: 0), CGPoint(x: position + reach, y: 0))
            : (CGPoint(x: 0, y: position - reach), CGPoint(x: 0, y: position + reach))
        ctx.drawLinearGradient(gradient, start: start, end: end, options: [])
    }

    private static func context(side: Int) -> CGContext? {
        guard side > 0, let space = CGColorSpace(name: CGColorSpace.sRGB) else { return nil }
        return CGContext(data: nil, width: side, height: side, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                         bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)
    }
}
