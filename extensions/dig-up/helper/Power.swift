// What the Mac is doing about power: DigUp's PowerPolicy asks the same three questions.
import Foundation
import IOKit.ps

enum Power {
    static func status() -> JSON {
        let info = ProcessInfo.processInfo
        let thermal: String
        switch info.thermalState {
        case .nominal: thermal = "nominal"
        case .fair: thermal = "fair"
        case .serious: thermal = "serious"
        case .critical: thermal = "critical"
        @unknown default: thermal = "nominal"
        }
        return ["onBattery": .bool(!onACPower()), "lowPower": .bool(info.isLowPowerModeEnabled), "thermal": .string(thermal)]
    }

    /// DigUp: PowerPolicy.onACPower. No power-source information means a desktop Mac.
    static func onACPower() -> Bool {
        guard let snapshot = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let type = IOPSGetProvidingPowerSourceType(snapshot)?.takeUnretainedValue() as String?
        else { return true }
        return type == kIOPMACPowerKey
    }
}
