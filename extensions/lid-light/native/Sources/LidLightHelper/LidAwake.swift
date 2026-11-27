import Foundation
import IOKit
import IOKit.pwr_mgt

/// Tells when the lid closes or opens, from the power management root domain (the notification
/// corebrightnessd itself goes by). With an external display the app sees the built-in display go
/// away; without one, and the Mac kept awake, nothing else says the lid has moved.
@MainActor
final class LidObserver {
    /// `kIOPMMessageClamshellStateChange` (IOPM.h), a macro Swift doesn't import.
    private static let clamshellStateChange: UInt32 = 0xE003_4100

    private let onChange: @MainActor () -> Void
    private var port: IONotificationPortRef?
    private var notifier: io_object_t = 0

    init(onChange: @escaping @MainActor () -> Void) {
        self.onChange = onChange
        let root = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("IOPMrootDomain"))
        guard root != IO_OBJECT_NULL, let port = IONotificationPortCreate(kIOMainPortDefault) else { return }
        defer { IOObjectRelease(root) }
        IONotificationPortSetDispatchQueue(port, .main)
        // The observer lives as long as the app, so the callback's pointer to it stays good.
        let result = IOServiceAddInterestNotification(port, root, kIOGeneralInterest, { context, _, type, _ in
            guard type == LidObserver.clamshellStateChange, let context else { return }
            let observer = Unmanaged<LidObserver>.fromOpaque(context).takeUnretainedValue()
            MainActor.assumeIsolated { observer.onChange() }
        }, Unmanaged.passUnretained(self).toOpaque(), &notifier)
        if result == KERN_SUCCESS { self.port = port } else { IONotificationPortDestroy(port) }
    }
}

/// Keeps the Mac awake when the lid closes, so the logo can stay lit without an external display.
///
/// What does it is the power management root domain's `kPMSetClamshellSleepState`: with lid sleep
/// disabled, a closed lid changes nothing for the Mac. A `PreventSystemSleep` assertion alone isn't
/// enough: the Mac then goes into a dark wake ("Entering DarkWake state due to 'Clamshell Sleep'"),
/// and the logo stays dark. Two assertions are held with it, against idle sleep, as in the probe
/// that showed this working (tools/probes/lidawake).
///
/// The kernel keeps that setting after the process that made it has gone, so a LogoLight that
/// crashed or was killed would leave a Mac that stays awake in a bag. A second process, the guard
/// (`LogoLight --lid-guard <pid>`), waits for this one to exit and then turns lid sleep back on.
@MainActor
final class LidSleepBlocker {
    private var assertions: [IOPMAssertionID] = []
    private var isDisabled = false
    private var hasGuard = false

    var isHolding: Bool { isDisabled }

    func set(_ holds: Bool) {
        guard holds != isDisabled else { return }
        if holds {
            guard startGuard(), LidSleep.setDisabled(true) else { return }
            isDisabled = true
            for type in [kIOPMAssertionTypePreventSystemSleep, kIOPMAssertionTypePreventUserIdleSystemSleep] {
                var id: IOPMAssertionID = 0
                let result = IOPMAssertionCreateWithName(
                    type as CFString, IOPMAssertionLevel(kIOPMAssertionLevelOn),
                    "LogoLight keeps the logo lit with the lid closed" as CFString, &id)
                if result == kIOReturnSuccess { assertions.append(id) }
            }
        } else {
            _ = LidSleep.setDisabled(false)
            isDisabled = false
            assertions.forEach { IOPMAssertionRelease($0) }
            assertions = []
        }
    }

    /// Starts the guard, once: it outlives this process by a moment, whatever ends it.
    private func startGuard() -> Bool {
        if hasGuard { return true }
        guard let executable = Bundle.main.executableURL else { return false }
        let process = Process()
        process.executableURL = executable
        process.arguments = [LidSleep.guardArgument, String(ProcessInfo.processInfo.processIdentifier)]
        process.standardInput = FileHandle.nullDevice
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        hasGuard = (try? process.run()) != nil
        return hasGuard
    }
}

/// Lid sleep: whether closing the lid puts the Mac to sleep.
enum LidSleep {
    static let guardArgument = "--lid-guard"

    /// Turns lid sleep off or back on. Needs no privileges. Returns whether the kernel took it.
    static func setDisabled(_ disabled: Bool) -> Bool {
        let root = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("IOPMrootDomain"))
        guard root != IO_OBJECT_NULL else { return false }
        defer { IOObjectRelease(root) }
        var connection: io_connect_t = 0
        guard IOServiceOpen(root, mach_task_self_, 0, &connection) == KERN_SUCCESS else { return false }
        defer { IOServiceClose(connection) }
        var input: UInt64 = disabled ? 1 : 0
        return IOConnectCallScalarMethod(connection, UInt32(kPMSetClamshellSleepState), &input, 1, nil, nil) == KERN_SUCCESS
    }

    /// The guard process: waits for the app (`pid`) to exit, turns lid sleep back on, and exits.
    /// The app has done that itself if it quit normally; doing it twice does no harm.
    static func runGuard(for pid: pid_t) -> Never {
        let source = DispatchSource.makeProcessSource(identifier: pid, eventMask: .exit, queue: .main)
        source.setEventHandler {
            _ = setDisabled(false)
            exit(0)
        }
        source.resume()
        // It may have gone before the source was set up.
        if kill(pid, 0) != 0, errno == ESRCH {
            _ = setDisabled(false)
            exit(0)
        }
        dispatchMain()
    }
}
