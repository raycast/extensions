import Foundation
import KeyboardClient
import ArgumentParser

@main
struct KB: ParsableCommand {
    static let configuration = CommandConfiguration(
        abstract: "Control MacBook keyboard backlight brightness"
    )

    @Argument(help: "Use 'get' to retrieve current brightness or 'set' to set brightness.")
    var command: String

    @Argument(help: "The brightness value to set (0.0-1.0). Only needed for 'set' command.")
    var brightness: String?

    func run() throws {
        let client = KeyboardBrightnessClient()

        guard let keyboards = client.copyKeyboardBacklightIDs(), !keyboards.isEmpty else {
            fputs("Your Mac or connected keyboard does not have a backlight\n", stderr)
            throw ExitCode.failure
        }

        let keyboardID = keyboards[0].uint64Value

        switch command {
        case "get":
            let brightness = client.brightness(forKeyboard: keyboardID)
            let rounded = Double(round(brightness * 100)) / 100
            let json: [String: Any] = ["brightness": rounded]
            let data = try JSONSerialization.data(withJSONObject: json, options: [])
            guard let str = String(data: data, encoding: .utf8) else {
                fputs("Failed to encode brightness response\n", stderr)
                throw ExitCode.failure
            }
            print(str)
        case "set":
            guard let valueStr = brightness, let value = Float(valueStr) else {
                fputs("Invalid brightness value\n", stderr)
                throw ExitCode.failure
            }
            let clamped = min(max(value, 0), 1)
            if client.isAutoBrightnessEnabled(forKeyboard: keyboardID) {
                let disabled = client.enableAutoBrightness(false, forKeyboard: keyboardID)
                if !disabled {
                    fputs("Warning: Could not disable auto-brightness\n", stderr)
                }
            }
            let result = client.setBrightness(clamped, forKeyboard: keyboardID)
            if !result {
                fputs("setBrightness returned false\n", stderr)
                throw ExitCode.failure
            }
        case "info":
            print("Keyboard IDs: \(keyboards)")
            print("Using keyboard ID: \(keyboardID)")
            print("Built-in: \(client.isKeyboardBuilt(in: keyboardID))")
            print("Auto-brightness enabled: \(client.isAutoBrightnessEnabled(forKeyboard: keyboardID))")
            print("Backlight dimmed: \(client.isBacklightDimmed(onKeyboard: keyboardID))")
            print("Backlight suppressed: \(client.isBacklightSuppressed(onKeyboard: keyboardID))")
            print("Backlight saturated: \(client.isBacklightSaturated(onKeyboard: keyboardID))")
            print("Current brightness: \(client.brightness(forKeyboard: keyboardID))")
        default:
            fputs("Unknown command: \(command). Use 'get', 'set', or 'info'.\n", stderr)
            throw ExitCode.failure
        }
    }
}
