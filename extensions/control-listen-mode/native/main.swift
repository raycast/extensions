import Darwin
import Foundation

func printJSON<T: Encodable>(_ result: T) throws {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    FileHandle.standardOutput.write(try encoder.encode(result))
    FileHandle.standardOutput.write(Data([0x0A]))
}

let controller = ListeningModeController(audio: CoreAudioBackend())
let arguments = Array(CommandLine.arguments.dropFirst())
if arguments == ["probe"] {
    try printJSON(controller.probe())
} else if arguments.count == 2 && arguments[0] == "toggle" && arguments[1].hasPrefix("/") {
    try printJSON(runToggle(lockPath: arguments[1]))
} else {
    FileHandle.standardError.write(Data("Usage: airpods-listening-mode probe | toggle <absolute-lock-path>\n".utf8))
    exit(2)
}
