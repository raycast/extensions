import QuartzCore

/// Raw values are the names the standalone app persists to remember the last color.
package enum GuideLineStyle: String, CaseIterable {
    case dynamic   // difference blend mode — visible on any background
    case red
    case green
    case orange
    case blue

    package var color: CGColor {
        switch self {
        case .dynamic: return CGColor(gray: 1.0, alpha: 1.0) // white + difference blend
        case .red:     return CGColor(srgbRed: 1.0, green: 0.3, blue: 0.3, alpha: 1.0)
        case .green:   return CGColor(srgbRed: 0.3, green: 0.85, blue: 0.4, alpha: 1.0)
        case .orange:  return CGColor(srgbRed: 1.0, green: 0.6, blue: 0.2, alpha: 1.0)
        case .blue:    return CGColor(srgbRed: 0.3, green: 0.5, blue: 1.0, alpha: 1.0)
        }
    }

    package var useDifferenceBlend: Bool { self == .dynamic }

    package func next() -> GuideLineStyle {
        let all = GuideLineStyle.allCases
        let idx = all.firstIndex(of: self)!
        return all[(idx + 1) % all.count]
    }
}
