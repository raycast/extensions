import Foundation
import IOKit.ps
import notify

/// The internal battery, for the battery indicator (the logo's brightness following its charge) and
/// the charging light (the logo breathing while it charges).
public enum Battery {
    /// The charge from 0 (empty) to 1 (full), the percentage the menu bar's battery shows, or `nil` on a
    /// Mac without a battery or when it can't be read.
    public static func charge() -> Double? {
        internalBattery().flatMap(charge(in:))
    }

    private static func charge(in description: [String: Any]) -> Double? {
        guard let current = description[kIOPSCurrentCapacityKey] as? Int,
              let capacity = description[kIOPSMaxCapacityKey] as? Int, capacity > 0
        else { return nil }
        return min(max(Double(current) / Double(capacity), 0), 1)
    }

    /// Whether the Mac is plugged in and the battery charging, for the charging light.
    public struct PowerState: Equatable, Sendable {
        /// Whether the Mac is on power: a charger is plugged in.
        public var isPluggedIn: Bool
        /// Whether the battery is taking charge, as the menu bar's battery shows with its bolt. macOS only
        /// says so a while after the Mac is plugged in (about a minute on the MacBook Pro, which said
        /// "AC attached; not charging" meanwhile), and not on power when the battery is full or held at a
        /// limit (Optimized Battery Charging's 80%).
        public var isCharging: Bool
        /// Whether the battery is full (100%).
        public var isFull: Bool

        public init(isPluggedIn: Bool, isCharging: Bool, isFull: Bool) {
            self.isPluggedIn = isPluggedIn
            self.isCharging = isCharging
            self.isFull = isFull
        }
    }

    /// Whether the Mac is plugged in and the battery charging, or `nil` on a Mac without a battery or
    /// when it can't be read.
    public static func powerState() -> PowerState? {
        guard let description = internalBattery(),
              let state = description[kIOPSPowerSourceStateKey] as? String,
              let isCharging = description[kIOPSIsChargingKey] as? Bool
        else { return nil }
        let isFull = description[kIOPSIsChargedKey] as? Bool == true || (charge(in: description) ?? 0) >= 1
        return PowerState(isPluggedIn: state == kIOPSACPowerValue, isCharging: isCharging, isFull: isFull)
    }

    /// The internal battery's power source description, if there's one.
    private static func internalBattery() -> [String: Any]? {
        guard let info = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let sources = IOPSCopyPowerSourcesList(info)?.takeRetainedValue() as? [CFTypeRef]
        else { return nil }
        for source in sources {
            guard let description = IOPSGetPowerSourceDescription(info, source)?.takeUnretainedValue()
                    as? [String: Any],
                  description[kIOPSTypeKey] as? String == kIOPSInternalBatteryType,
                  description[kIOPSIsPresentKey] as? Bool != false
            else { continue }
            return description
        }
        return nil
    }
}

/// Calls `onChange` on the main thread when anything about a power source changes, for as long as
/// it's kept: being plugged in or unplugged, charging starting or stopping, and the charge, about once a
/// minute. That's more often than the percentage changes (the notification for just that is private),
/// so `onChange` should be cheap and check what changed.
@MainActor
public final class BatteryObserver {
    /// `nil` if registering failed.
    private let token: Int32?

    public init(onChange: @escaping @MainActor () -> Void) {
        var token: Int32 = 0
        let status = notify_register_dispatch(kIOPSNotifyAnyPowerSource, &token, .main) { _ in
            MainActor.assumeIsolated { onChange() }
        }
        self.token = status == NOTIFY_STATUS_OK ? token : nil
    }

    deinit {
        if let token { notify_cancel(token) }
    }
}
