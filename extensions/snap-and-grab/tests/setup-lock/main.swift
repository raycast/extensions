import AppKit
import Darwin
import Foundation

@_silgen_name("flock")
private func probeLock(_ fd: Int32, _ operation: Int32) -> Int32

if CommandLine.arguments.count == 3 && CommandLine.arguments[1] == "probe" {
    let fd = Darwin.open(CommandLine.arguments[2], O_RDWR)
    guard fd >= 0 else { exit(2) }
    defer { Darwin.close(fd) }
    exit(probeLock(fd, LOCK_EX | LOCK_NB) == 0 ? 0 : 3)
}
let root = FileManager.default.temporaryDirectory.appendingPathComponent("snap-setup-lock-\(UUID().uuidString)")
try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
defer { try? FileManager.default.removeItem(at: root) }
let invalidFolder = root.appendingPathComponent("not-a-directory")
try Data("file".utf8).write(to: invalidFolder)
let support = root.appendingPathComponent("support")
do {
    try runCaptureSession(folderPath: invalidFolder.path, supportPath: support.path, previews: false, confirmationDuration: 0, initialFlags: 0, requestedAt: 0)
    fatalError("Setup with a file as the screenshot folder must fail")
} catch {
    // Stay alive, just like the bridge's four-second error HUD, while another
    // process tries the same lock. It must not wait for this process to exit.
    let contender = Process()
    contender.executableURL = URL(fileURLWithPath: CommandLine.arguments[0]).standardizedFileURL
    contender.arguments = ["probe", support.appendingPathComponent("batch.lock").path]
    try contender.run()
    contender.waitUntilExit()
    guard contender.terminationStatus == 0 else { fatalError("Setup failure retained the capture lock; immediate retry is blocked") }
}
print("PASS: failed folder setup releases the lock while the failing process remains alive")
