import Foundation
#if os(macOS)
import IOKit.ps
#endif

public enum IndexPower {
    public static var blocker: String? {
        #if os(macOS)
        let process = ProcessInfo.processInfo
        if process.isLowPowerModeEnabled { return "Low Power Mode" }
        if process.thermalState == .serious || process.thermalState == .critical { return "Mac is warm" }
        if let snapshot = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
           let source = IOPSGetProvidingPowerSourceType(snapshot)?.takeUnretainedValue(), source as String != kIOPMACPowerKey { return "on battery" }
        #endif
        return nil
    }
}
