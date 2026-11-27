import Foundation

guard CommandLine.arguments.count == 2 else { exit(1) }
do {
    try runCaptureSession(folderPath: CommandLine.arguments[1], supportPath: FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Capture and Copy").path, previews: true, confirmationDuration: 1.4)
} catch { fputs("\(error)\n", stderr); exit(1) }
