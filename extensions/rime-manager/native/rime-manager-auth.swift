import Darwin
import AppKit
import Foundation
import LocalAuthentication

@main
struct RimeManagerAuthentication {
    private static func argument(named name: String) -> String? {
        guard let index = CommandLine.arguments.firstIndex(of: name) else { return nil }
        let valueIndex = CommandLine.arguments.index(after: index)
        guard valueIndex < CommandLine.arguments.endIndex else { return nil }
        return CommandLine.arguments[valueIndex]
    }

    private static func openDeeplinkAfterDelay(_ value: String) async {
        try? await Task.sleep(nanoseconds: 350_000_000)
        guard let url = URL(string: value), url.scheme == "raycast" else { return }
        _ = NSWorkspace.shared.open(url)
    }

    private static func scheduleRaycastReturn(_ deeplink: String?) {
        guard let executableURL = Bundle.main.executableURL, let deeplink else { return }
        let process = Process()
        process.executableURL = executableURL
        process.arguments = ["--open-deeplink", deeplink]
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        try? process.run()
    }

    private static func writeRevealGrant(at path: String?) throws {
        guard let path else { return }
        let timestamp = String(Int64(Date().timeIntervalSince1970 * 1_000))
        try timestamp.write(toFile: path, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: path)
    }

    static func main() async {
        if let deeplink = argument(named: "--open-deeplink") {
            await openDeeplinkAfterDelay(deeplink)
            return
        }

        let grantPath = argument(named: "--grant-path")
        let deeplink = argument(named: "--deeplink")

        let context = LAContext()
        context.localizedCancelTitle = "Cancel"

        var policyError: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &policyError) else {
            scheduleRaycastReturn(deeplink)
            let message = policyError?.localizedDescription ?? "Local authentication is unavailable on this Mac"
            fputs("AUTH_UNAVAILABLE:\(message)\n", stderr)
            exit(2)
        }

        if CommandLine.arguments.contains("--check") {
            print("AVAILABLE")
            return
        }

        do {
            let authenticated = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: "Reveal hidden Rime candidate rules"
            )
            guard authenticated else {
                scheduleRaycastReturn(deeplink)
                fputs("AUTH_FAILED\n", stderr)
                exit(3)
            }
            try writeRevealGrant(at: grantPath)
            scheduleRaycastReturn(deeplink)
            print("AUTHENTICATED")
        } catch {
            scheduleRaycastReturn(deeplink)
            let nsError = error as NSError
            if nsError.domain == LAError.errorDomain,
               let code = LAError.Code(rawValue: nsError.code),
               code == .userCancel || code == .systemCancel || code == .appCancel {
                fputs("AUTH_CANCELED\n", stderr)
                exit(3)
            }
            fputs("AUTH_FAILED:\(nsError.localizedDescription)\n", stderr)
            exit(3)
        }
    }
}
