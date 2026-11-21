import ApplicationServices
import Foundation
import RaycastSwiftMacros

@raycast
func helperExecutablePath() -> String {
  URL(fileURLWithPath: CommandLine.arguments[0]).standardizedFileURL.path
}

/// Workers use the same Store-built executable and keep their original stdout protocols.
@raycast
func runHelper(helper: String, args: [String]) async {
  await MainActor.run {
    do {
      switch helper {
      case "runtime-status":
        let data = try JSONSerialization.data(withJSONObject: ["accessibility": AXIsProcessTrusted()])
        print(String(decoding: data, as: UTF8.self))
      case "macos-windows":
        try MacOSWindowsHelper.run(args: args)
      case "chromium-ax":
        BrowserHelperRuntime.run(args: args, list: ChromiumHelper.handleList, focus: ChromiumHelper.handleFocus)
      case "webkit-ax":
        BrowserHelperRuntime.run(args: args, list: WebKitHelper.handleList, focus: WebKitHelper.handleFocus)
      case "firefox-ax":
        BrowserHelperRuntime.run(args: args, list: FirefoxHelper.handleList, focus: FirefoxHelper.handleFocus)
      case "firefox-bridge":
        try FirefoxBridge.start(args: args)
      default:
        throw NSError(domain: "AppHopper", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unknown native helper"])
      }
    } catch {
      fputs((error as NSError).localizedDescription + "\n", stderr)
      exit(1)
    }
    // The generated RPC entry would otherwise append a JSON return value to worker stdout.
    exit(0)
  }
}
