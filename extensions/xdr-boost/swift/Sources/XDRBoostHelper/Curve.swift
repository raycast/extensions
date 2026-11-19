import Foundation

/// How a level becomes a table factor.
///
/// Levels are positions from Off (1.0) to Max (1.75). Each display has a maximum LIGHT gain (SDR white × gain);
/// a level's position is spaced evenly in light from 1 to that maximum, then written to the transfer table as
/// gain^(1/2.2), because the table holds gamma-encoded values: scaling it by f scales light by about f^2.2.
/// (Documented, and checked against an EDR reference, in xdr-lift's app/Booster.swift, MIT,
/// https://github.com/Justaboringname/xdr-lift.)
///
/// Two strategies (the extension's "Boost Strategy" preference):
/// - adaptive ("Follow Brightness"): the maximum follows the panel's current EDR headroom H, which rises as the
///   brightness slider goes down: min(0.6·H, builtInMaxGain, nitsCap·H/peak). The 0.6·H share and the per-model
///   peaks follow Illuminate's BoostCurve.swift and DisplayProfile.swift (MIT,
///   https://github.com/fackelmeyer/illuminate). The nits cap is XDR Boost's own, from a Pro Display XDR that
///   held about 565 nits and blanked at about 750 (estimates under the f^2.2 model and a 1600-nit peak; see
///   docs/solutions/pro-display-xdr-blanks-on-gamma-table-edr-boost.md).
/// - fixed ("Fixed Maximum"): built-in displays reach builtInMaxGain; external XDR displays reach the
///   "External XDR Maximum" preference.
/// Every write is also held to light ≤ 0.95·H (xdr-lift's cap) in Booster.write.
enum Curve {
    static let encodingGamma = 2.2
    /// Max on a built-in display: 1.75 in the table (1.75^2.2 ≈ 3.43 in light). Equal to BUILT_IN_MAX_GAIN in TypeScript.
    static let builtInMaxGain = pow(1.75, encodingGamma)
    /// Illuminate's sustainedFraction: the share of headroom used at full boost.
    static let headroomShare = 0.6
    /// xdr-lift's cap: light never above this share of the live headroom.
    static let headroomSafety = 0.95

    struct Profile {
        /// Panel peak in nits (Apple tech specs, as in Illuminate's DisplayProfile).
        let peak: Double
        /// Highest boosted SDR white in nits; nil = no model-specific cap.
        let nitsCap: Double?
    }

    static func profile(name: String, builtIn: Bool) -> Profile {
        if builtIn { return Profile(peak: 1600, nitsCap: nil) }
        // 560 keeps a margin under the ~565 nits one Pro Display XDR held (see the header).
        if name.localizedStandardContains("Pro Display XDR") { return Profile(peak: 1600, nitsCap: 560) }
        // Not measured: the same conservative cap until there are reports for this model.
        if name.localizedStandardContains("Studio Display XDR") { return Profile(peak: 2000, nitsCap: 560) }
        return Profile(peak: 1600, nitsCap: 560)
    }

    static func tableFactor(gain: Double) -> Double { pow(max(gain, 1.0), 1.0 / encodingGamma) }
    static func gain(tableFactor: Double) -> Double { pow(max(tableFactor, 1.0), encodingGamma) }

    /// The highest light gain for a display under a strategy.
    static func maxGain(strategy: String, profile: Profile, builtIn: Bool, headroom: Double, externalMax: Double) -> Double {
        if strategy == "fixed" { return builtIn ? builtInMaxGain : max(externalMax, 1.0) }
        var gain = min(headroomShare * headroom, builtInMaxGain)
        if let cap = profile.nitsCap { gain = min(gain, cap * headroom / profile.peak) }
        return max(gain, 1.0)
    }

    /// The table factor for a nominal level (1.0 = off … 1.75 = Max) under a maximum light gain.
    static func tableFactor(level: Double, maxGain: Double, maxLevel: Double) -> Double {
        guard level > 1.0 else { return 1.0 }
        let position = min((level - 1.0) / (maxLevel - 1.0), 1.0)
        return tableFactor(gain: 1.0 + position * (maxGain - 1.0))
    }
}
