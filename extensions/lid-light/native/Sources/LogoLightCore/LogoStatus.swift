import Foundation

/// Whether the illuminated Apple logo is set to light up.
public enum LogoIllumination: String, Sendable, Equatable, CaseIterable {
    case on
    case off

    public var toggled: LogoIllumination { self == .on ? .off : .on }
}

/// A snapshot of the logo's setting and the LED's live output.
public struct LogoStatus: Sendable, Equatable {
    /// Where `setting` was determined from.
    public enum Source: Sendable, Equatable {
        /// `corebrightnessd` itself. Always current.
        case daemon
        /// The LED driver, read while the built-in display is awake. Always current.
        case led
        /// The NVRAM mirror. `corebrightnessd` doesn't write it as soon as the setting
        /// changes, so it can be out of date until a later point such as a restart.
        case nvram
        /// The setting LogoLight itself applied most recently (used when the LED can't tell).
        case lastApplied
    }

    /// `false` when this Mac has no illuminated logo.
    public var isSupported: Bool
    /// The user's setting. `nil` when it can't be determined.
    public var setting: LogoIllumination?
    public var source: Source?
    /// Whether the logo's LED driver is currently switched on.
    public var isLit: Bool?
    /// The LED driver's current PWM duty cycle, from 0 to 1.
    /// macOS adjusts this automatically to follow display brightness and ambient light.
    public var outputLevel: Double?

    public init(isSupported: Bool, setting: LogoIllumination?, source: Source?, isLit: Bool?, outputLevel: Double?) {
        self.isSupported = isSupported
        self.setting = setting
        self.source = source
        self.isLit = isLit
        self.outputLevel = outputLevel
    }

    public static let unsupported = LogoStatus(isSupported: false, setting: nil, source: nil, isLit: nil, outputLevel: nil)
}

/// Where the logo's state lives in the I/O Registry on PROLED MacBook Pro models.
public enum LogoHardware {
    /// Name of the back-lid logo PWM device in the I/O Registry.
    public static let pwmDeviceName = "bklb-backlight"
    /// NVRAM variable in which `corebrightnessd` persists the `LEBacklightMode` setting
    /// (`"true"` or `"false"`), which is how it also applies in macOS Recovery.
    /// It isn't updated as soon as the setting changes.
    public static let nvramKey = "\(pwmDeviceName)-enabled"
}
