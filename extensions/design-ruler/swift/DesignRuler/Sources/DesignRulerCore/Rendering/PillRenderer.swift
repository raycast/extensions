import AppKit
import CoreText
import QuartzCore

/// Centralized pill rendering factory.
/// Caseless enum prevents instantiation — access via `PillRenderer.makeDimensionPill(...)`.
///
/// Each factory method creates a fully configured layer hierarchy (backgrounds, text layers,
/// shadows) and adds all layers to the provided parent layer. Callers only set position and
/// text content after creation.
package enum PillRenderer {

    // MARK: - Return types

    /// Dimension pill: split W/H sections (CrosshairView).
    package struct DimensionPill {
        package let wBgLayer: CAShapeLayer
        package let hBgLayer: CAShapeLayer
        package let wLabelLayer: CATextLayer
        package let hLabelLayer: CATextLayer
        package let wValueLayer: CATextLayer
        package let hValueLayer: CATextLayer
        package var allLayers: [CALayer] { [wBgLayer, hBgLayer, wLabelLayer, hLabelLayer, wValueLayer, hValueLayer] }
    }

    /// Position pill: single label + value (GuideLine).
    package struct PositionPill {
        package let bgLayer: CAShapeLayer
        package let labelLayer: CATextLayer
        package let valueLayer: CATextLayer
        package var allLayers: [CALayer] { [bgLayer, labelLayer, valueLayer] }
    }

    /// Selection pill: single text layer with center alignment (SelectionOverlay).
    package struct SelectionPill {
        package let bgLayer: CAShapeLayer
        package let textLayer: CATextLayer
        package var allLayers: [CALayer] { [bgLayer, textLayer] }
    }

    // MARK: - Factory methods

    /// Create a dimension pill with 2 background sections and 4 text layers.
    /// Matches CrosshairView.setupLayers layer configuration exactly.
    package static func makeDimensionPill(parentLayer: CALayer, scale: CGFloat) -> DimensionPill {
        let wBg = CAShapeLayer()
        let hBg = CAShapeLayer()

        for bg in [wBg, hBg] {
            bg.fillColor = DesignTokens.Pill.backgroundColor
            bg.strokeColor = nil
            applyShadow(to: bg)
            parentLayer.addSublayer(bg)
        }

        let wLabel = CATextLayer()
        let hLabel = CATextLayer()
        let wValue = CATextLayer()
        let hValue = CATextLayer()

        for tl in [wLabel, hLabel, wValue, hValue] {
            configureTextLayer(tl, scale: scale)
            parentLayer.addSublayer(tl)
        }

        return DimensionPill(
            wBgLayer: wBg, hBgLayer: hBg,
            wLabelLayer: wLabel, hLabelLayer: hLabel,
            wValueLayer: wValue, hValueLayer: hValue
        )
    }

    /// Create a position pill with 1 background and 2 text layers.
    /// Matches GuideLine.setupLayers pill layer configuration exactly.
    package static func makePositionPill(parentLayer: CALayer, scale: CGFloat) -> PositionPill {
        let bg = CAShapeLayer()
        bg.fillColor = DesignTokens.Pill.backgroundColor
        bg.strokeColor = nil
        applyShadow(to: bg)
        bg.contentsScale = scale
        parentLayer.addSublayer(bg)

        let label = CATextLayer()
        let value = CATextLayer()

        for tl in [label, value] {
            configureTextLayer(tl, scale: scale)
            parentLayer.addSublayer(tl)
        }

        return PositionPill(bgLayer: bg, labelLayer: label, valueLayer: value)
    }

    /// Create a selection pill with 1 background and 1 center-aligned text layer.
    /// Matches SelectionOverlay.setupLayers pill configuration exactly.
    /// Both layers start hidden (opacity 0).
    package static func makeSelectionPill(parentLayer: CALayer, scale: CGFloat) -> SelectionPill {
        let bg = CAShapeLayer()
        bg.fillColor = DesignTokens.Pill.backgroundColor
        bg.strokeColor = nil
        applyShadow(to: bg)
        parentLayer.addSublayer(bg)

        let text = CATextLayer()
        // SelectionOverlay uses size-11 font with fontSize override to 12
        text.font = makeDesignFont(size: 11)
        text.fontSize = 12
        text.foregroundColor = CGColor(gray: 1.0, alpha: 1.0)
        text.alignmentMode = .center
        text.truncationMode = .none
        text.contentsScale = scale
        parentLayer.addSublayer(text)

        // Start hidden (shown after snap animation)
        bg.opacity = 0
        text.opacity = 0

        return SelectionPill(bgLayer: bg, textLayer: text)
    }

    // MARK: - Path generators

    /// Continuous-corner (squircle) rounded rect path with uniform radius.
    /// Radius is clamped to `min(radius, min(width, height) / 2)` for safety.
    /// Kappa = 0.72 for continuous corner curvature.
    package static func squirclePath(rect: CGRect, radius: CGFloat) -> CGPath {
        let r = min(radius, min(rect.width, rect.height) / 2)
        let path = CGMutablePath()
        let k: CGFloat = 0.72

        // Top edge
        path.move(to: CGPoint(x: rect.minX + r, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX - r, y: rect.maxY))

        // Top-right corner
        path.addCurve(to: CGPoint(x: rect.maxX, y: rect.maxY - r),
                      control1: CGPoint(x: rect.maxX - r * (1 - k), y: rect.maxY),
                      control2: CGPoint(x: rect.maxX, y: rect.maxY - r * (1 - k)))

        // Right edge
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + r))

        // Bottom-right corner
        path.addCurve(to: CGPoint(x: rect.maxX - r, y: rect.minY),
                      control1: CGPoint(x: rect.maxX, y: rect.minY + r * (1 - k)),
                      control2: CGPoint(x: rect.maxX - r * (1 - k), y: rect.minY))

        // Bottom edge
        path.addLine(to: CGPoint(x: rect.minX + r, y: rect.minY))

        // Bottom-left corner
        path.addCurve(to: CGPoint(x: rect.minX, y: rect.minY + r),
                      control1: CGPoint(x: rect.minX + r * (1 - k), y: rect.minY),
                      control2: CGPoint(x: rect.minX, y: rect.minY + r * (1 - k)))

        // Left edge
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY - r))

        // Top-left corner
        path.addCurve(to: CGPoint(x: rect.minX + r, y: rect.maxY),
                      control1: CGPoint(x: rect.minX, y: rect.maxY - r * (1 - k)),
                      control2: CGPoint(x: rect.minX + r * (1 - k), y: rect.maxY))

        path.closeSubpath()
        return path
    }

    /// Rounded rect path with independent left/right corner radii and continuous corners.
    /// Each radius is clamped independently to `rect.height / 2`.
    /// Kappa = 0.72 for continuous corner curvature.
    package static func sectionPath(rect: CGRect, leftRadius: CGFloat, rightRadius: CGFloat) -> CGPath {
        let lr = min(leftRadius, rect.height / 2)
        let rr = min(rightRadius, rect.height / 2)
        let path = CGMutablePath()
        let k: CGFloat = 0.72

        // Top edge
        path.move(to: CGPoint(x: rect.minX + lr, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX - rr, y: rect.maxY))

        // Top-right corner
        path.addCurve(to: CGPoint(x: rect.maxX, y: rect.maxY - rr),
                      control1: CGPoint(x: rect.maxX - rr * (1 - k), y: rect.maxY),
                      control2: CGPoint(x: rect.maxX, y: rect.maxY - rr * (1 - k)))

        // Right edge
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + rr))

        // Bottom-right corner
        path.addCurve(to: CGPoint(x: rect.maxX - rr, y: rect.minY),
                      control1: CGPoint(x: rect.maxX, y: rect.minY + rr * (1 - k)),
                      control2: CGPoint(x: rect.maxX - rr * (1 - k), y: rect.minY))

        // Bottom edge
        path.addLine(to: CGPoint(x: rect.minX + lr, y: rect.minY))

        // Bottom-left corner
        path.addCurve(to: CGPoint(x: rect.minX, y: rect.minY + lr),
                      control1: CGPoint(x: rect.minX + lr * (1 - k), y: rect.minY),
                      control2: CGPoint(x: rect.minX, y: rect.minY + lr * (1 - k)))

        // Left edge
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY - lr))

        // Top-left corner
        path.addCurve(to: CGPoint(x: rect.minX + lr, y: rect.maxY),
                      control1: CGPoint(x: rect.minX, y: rect.maxY - lr * (1 - k)),
                      control2: CGPoint(x: rect.minX + lr * (1 - k), y: rect.maxY))

        path.closeSubpath()
        return path
    }

    // MARK: - Text formatters

    /// Label text (e.g., "W", "H", "X", "Y") — semibold, 50% white, kerned.
    package static func labelText(_ label: String) -> NSAttributedString {
        NSAttributedString(string: label, attributes: [
            .font: font12,
            .foregroundColor: NSColor(white: 1, alpha: 0.5),
            .kern: DesignTokens.Pill.kerning,
        ])
    }

    /// Value text — zero-padded 4-digit, dim leading zeros (20% white), bright digits (white), kerned.
    package static func valueText(_ value: Int) -> NSAttributedString {
        let padded = String(format: "%04d", min(value, 9999))
        let digitCount = String(value).count
        let zeroCount = max(0, 4 - digitCount)

        let attrs: [NSAttributedString.Key: Any] = [
            .font: font12,
            .kern: DesignTokens.Pill.kerning,
        ]
        let attr = NSMutableAttributedString()
        if zeroCount > 0 {
            var dimAttrs = attrs
            dimAttrs[.foregroundColor] = NSColor(white: 1, alpha: 0.2)
            attr.append(NSAttributedString(string: String(padded.prefix(zeroCount)), attributes: dimAttrs))
        }
        var brightAttrs = attrs
        brightAttrs[.foregroundColor] = NSColor.white
        attr.append(NSAttributedString(string: String(padded.suffix(digitCount)), attributes: brightAttrs))
        return attr
    }

    // MARK: - Font factory

    /// SF Pro Semibold with 8 OpenType feature tags for monospaced digits and stylistic alternates.
    /// Public so consumers needing non-standard sizes (e.g., SelectionOverlay's size-11) can create their own font.
    package static func makeDesignFont(size: CGFloat) -> NSFont {
        let base = NSFont.systemFont(ofSize: size, weight: .semibold)
        let tags = ["ss01", "ss02", "cv01", "cv02", "cv08", "cv12", "lnum", "tnum"]
        let features: [[String: Any]] = tags.map { tag in
            [kCTFontOpenTypeFeatureTag as String: tag, kCTFontOpenTypeFeatureValue as String: 1]
        }
        let desc = CTFontDescriptorCreateWithAttributes(
            [kCTFontFeatureSettingsAttribute: features] as CFDictionary
        )
        let ctFont = CTFontCreateCopyWithAttributes(base as CTFont, size, nil, desc)
        return ctFont as NSFont
    }

    // MARK: - Shadow presets

    /// Apply the standard pill shadow from DesignTokens.
    /// Called automatically by all pill factory methods.
    private static func applyShadow(to layer: CAShapeLayer) {
        layer.shadowColor = DesignTokens.Shadow.color
        layer.shadowOffset = DesignTokens.Shadow.offset
        layer.shadowRadius = DesignTokens.Shadow.radius
        layer.shadowOpacity = DesignTokens.Shadow.opacity
    }

    /// Apply circle shadow preset for ColorCircleIndicator.
    /// Visually distinct from pill shadow (lower opacity, different color).
    package static func applyCircleShadow(to layer: CALayer) {
        layer.shadowColor = CGColor(gray: 0, alpha: 1.0)
        layer.shadowOffset = CGSize(width: 0, height: -1)
        layer.shadowRadius = 3
        layer.shadowOpacity = 0.25
    }

    // MARK: - Private helpers

    /// Cached font for labelText/valueText (size 12).
    private static let font12 = makeDesignFont(size: 12)

    /// Configure a text layer with standard pill text properties.
    private static func configureTextLayer(_ layer: CATextLayer, scale: CGFloat) {
        layer.contentsScale = scale
        layer.truncationMode = .none
        layer.isWrapped = false
        layer.alignmentMode = .left
        layer.allowsFontSubpixelQuantization = true
    }
}
