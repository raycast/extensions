import Foundation
import CoreGraphics
let name = Notification.Name("com.alon.snapAndGrab.captureRequested")
let observer = DistributedNotificationCenter.default().addObserver(forName: name, object: NSUserName(), queue: .main) { _ in
    print("PASS: duplicate hotkey invocation reached active session without opening capture")
    exit(0)
}
print("READY")
fflush(stdout)
Timer.scheduledTimer(withTimeInterval: 5, repeats: false) { _ in
    fputs("FAIL: hotkey request notification was not delivered\n", stderr)
    exit(1)
}
let flags = CGEventSource.flagsState(.combinedSessionState)
print("Modifier state query succeeded: \(flags.rawValue)")
RunLoop.main.run()
