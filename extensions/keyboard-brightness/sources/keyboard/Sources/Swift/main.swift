import Cocoa
import Foundation
import KeyboardClient
import ArgumentParser

@main
struct KB: ParsableCommand {
    @Argument(help: "Use 'get' to retrieve current brightness or 'set' to set brightness.")
    var command: String

    @Argument(help: "The brightness value to set. Only needed for 'set' command.")
    var brightness: String?

    func run() throws {
        let client = KeyboardBrightnessClient()

        switch command {
        case "get":
            let brightness = client.brightness(forKeyboard: 1)
            let roundedBrightness = Decimal(Double(round(brightness * 100)) / 100)
            let brightnessJSON = ["brightness": roundedBrightness]
            let jsonData = try! JSONSerialization.data(withJSONObject: brightnessJSON, options: .prettyPrinted)
            let jsonString = String(data: jsonData, encoding: .utf8)!
            print(jsonString)
        case "set":
            guard let brightnessValue = Float(brightness ?? "") else {
                print("Invalid brightness value")
                throw ExitCode.failure
            }
            client.setBrightness(brightnessValue, forKeyboard: 1)
            print("Brightness set to: \(brightnessValue)")
        default:
            print("Invalid command")
            throw ExitCode.failure
        }
    }
}