import QuartzCore

/// Centralized design constants shared across all overlay views.
/// Caseless enum prevents instantiation — access values as `DesignTokens.Pill.height`.
package enum DesignTokens {

    // MARK: - Pill layout

    package enum Pill {
        package static let height: CGFloat = 24
        package static let cornerRadius: CGFloat = 8
        package static let innerCornerRadius: CGFloat = 4
        package static let sectionGap: CGFloat = 2
        package static let backgroundColor: CGColor = CGColor(gray: 0, alpha: 0.8)
        package static let kerning: CGFloat = -0.36
    }

    // MARK: - Shadow

    package enum Shadow {
        package static let color: CGColor = CGColor(gray: 0, alpha: 0.3)
        package static let offset: CGSize = CGSize(width: 0, height: -1)
        package static let radius: CGFloat = 3
        package static let opacity: Float = 1.0
    }

    // MARK: - Colors

    package enum Color {
        package static let hoverRed: CGColor = CGColor(srgbRed: 1.0, green: 0.35, blue: 0.35, alpha: 1.0)
        package static let hoverRedFill: CGColor = CGColor(srgbRed: 1.0, green: 0.35, blue: 0.35, alpha: 0.06)
        package static let hoverRedPillBg: CGColor = CGColor(srgbRed: 0.85, green: 0.2, blue: 0.2, alpha: 0.85)
        package static let removePillBg: CGColor = CGColor(srgbRed: 1.0, green: 0.35, blue: 0.35, alpha: 0.9)
    }

    // MARK: - Animation durations (named speed tiers)

    package enum Animation {
        package static let fast: CFTimeInterval = 0.15
        package static let standard: CFTimeInterval = 0.2
        package static let slow: CFTimeInterval = 0.3
        package static let zoom: CFTimeInterval = 0.25
        package static let collapse: CFTimeInterval = 0.35
        package static let peekPan: CFTimeInterval = 0.2
        package static let peekHold: CFTimeInterval = 0.6
        package static let peekReturn: CFTimeInterval = 0.2
        package static let launchWave: CFTimeInterval = 1.5
    }
}

/// Single source of truth for Core Animation compositing filter strings.
/// Caseless enum prevents instantiation — use `BlendMode.difference`.
package enum BlendMode {
    package static let difference: String = "differenceBlendMode"
}
