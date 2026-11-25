import Foundation

/// The generated TypeScript bridge uses JSON arguments and a JSON result. Keep a
/// synchronous process entry for AppKit: an async-main executor cannot be held
/// inside NSApplication.run while capture needs main-actor permission callbacks.
@main
struct RecorderTool {
  static func main() {
    do {
      let arguments = CommandLine.arguments
      guard arguments.count >= 3 else { throw ToolError.invalidArguments }
      let first = try JSONDecoder().decode(String.self, from: Data(arguments[2].utf8))
      let result: Data
      switch arguments[1] {
      case "startRecorder":
        try startRecorder(statePath: first)
        result = Data("null".utf8)
      case "runRecorderWorker":
        runRecorderWorker(statePath: first)
        return
      case "recorderCommand":
        guard arguments.count == 4 else { throw ToolError.invalidArguments }
        let payload = try JSONDecoder().decode(String.self, from: Data(arguments[3].utf8))
        result = try JSONEncoder().encode(recorderCommand(statePath: first, payload: payload))
      case "inspectRecording":
        result = try JSONEncoder().encode(inspectRecording(filePath: first))
      default:
        throw ToolError.invalidArguments
      }
      FileHandle.standardOutput.write(result)
      FileHandle.standardOutput.write(Data("\n".utf8))
    } catch {
      FileHandle.standardError.write(Data((error.localizedDescription + "\n").utf8))
      exit(EXIT_FAILURE)
    }
  }
  enum ToolError: LocalizedError {
    case invalidArguments
    var errorDescription: String? { "Invalid Audio Recorder tool command or JSON arguments." }
  }
}
