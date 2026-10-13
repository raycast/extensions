import Cocoa
import Foundation
import RaycastSwiftMacros

struct EditorInput: Decodable {
    let text: String
    let indent: Int
}

private struct EditorLaunchError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

private func editorDirectory(for request: URL) -> URL {
    request.deletingLastPathComponent().appendingPathComponent("editor-" + request.deletingPathExtension().lastPathComponent)
}

@raycast
func startEditor(requestPath: String) throws {
    let request = URL(fileURLWithPath: requestPath)
    guard FileManager.default.fileExists(atPath: requestPath) else {
        throw EditorLaunchError(message: "The editor input file is missing.")
    }
    let worker = Process()
    worker.executableURL = URL(fileURLWithPath: CommandLine.arguments[0])
    let encodedPath = String(data: try JSONEncoder().encode(requestPath), encoding: .utf8)!
    worker.arguments = ["runEditorWorker", encodedPath]
    worker.standardInput = FileHandle.nullDevice
    worker.standardOutput = FileHandle.nullDevice
    worker.standardError = FileHandle.nullDevice
    do {
        try worker.run()
        let deadline = Date().addingTimeInterval(5)
        while FileManager.default.fileExists(atPath: requestPath) {
            guard worker.isRunning else {
                throw EditorLaunchError(message: "The editor exited before reading its input.")
            }
            guard Date() < deadline else {
                throw EditorLaunchError(message: "The editor did not read its input within 5 seconds.")
            }
            Thread.sleep(forTimeInterval: 0.025)
        }
    } catch {
        if worker.isRunning { worker.terminate(); worker.waitUntilExit() }
        try? FileManager.default.removeItem(at: editorDirectory(for: request))
        throw error
    }
}

@raycast
func runEditorWorker(requestPath: String) async throws {
    let request = URL(fileURLWithPath: requestPath)
    let attributes = try FileManager.default.attributesOfItem(atPath: requestPath)
    guard (attributes[.size] as? Int ?? 0) <= 6 * 8 * 1024 * 1024 + 1024 else {
        throw EditorLaunchError(message: "The editor input exceeds 8 MiB.")
    }
    let input = try JSONDecoder().decode(EditorInput.self, from: Data(contentsOf: request))
    guard input.text.utf8.count <= 8 * 1024 * 1024 else {
        throw EditorLaunchError(message: "The editor input exceeds 8 MiB.")
    }
    let directory = editorDirectory(for: request)
    defer { try? FileManager.default.removeItem(at: directory) }
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700])
    try EmbeddedEditor.write(to: directory)
    await MainActor.run {
        let application = NSApplication.shared
        application.setActivationPolicy(.regular)
        let controller = EditorDelegate(request: request, editorDirectory: directory, html: directory.appendingPathComponent("index.html"), input: input)
        application.delegate = controller
        application.run()
        // NSApplication's delegate is weak; keep it alive for the whole run loop.
        withExtendedLifetime(controller) {}
    }
}
