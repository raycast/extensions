import AppKit
import CoreGraphics
import Foundation
import RaycastSwiftMacros

struct ScreenshotMetadata: Encodable {
    let path: String
    let name: String
    let modifiedAt: String
}

struct ScreenshotListing: Encodable {
    let folder: String
    let screenshots: [ScreenshotMetadata]
}

private func screenshotFolder(_ path: String) -> String {
    if !path.isEmpty { return NSString(string: path).expandingTildeInPath }
    let configured = UserDefaults(suiteName: "com.apple.screencapture")?.string(forKey: "location")
    return configured.map { NSString(string: $0).expandingTildeInPath }
        ?? FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Desktop").path
}

private func encoded<T: Encodable>(_ value: T) throws -> String {
    String(decoding: try JSONEncoder().encode(value), as: UTF8.self)
}

private func spawn(_ function: String, arguments: [String], supportPath: String, awaitClipboard: Bool = false) throws {
    try FileManager.default.createDirectory(atPath: supportPath, withIntermediateDirectories: true)
    let process = Process()
    process.executableURL = URL(fileURLWithPath: CommandLine.arguments[0])
    process.arguments = [function] + arguments
    process.standardInput = FileHandle.nullDevice
    let acknowledgement = Pipe()
    process.standardOutput = awaitClipboard ? acknowledgement : FileHandle.nullDevice
    let logURL = URL(fileURLWithPath: supportPath).appendingPathComponent("native.log")
    if !FileManager.default.fileExists(atPath: logURL.path) { FileManager.default.createFile(atPath: logURL.path, contents: nil) }
    let log = try FileHandle(forWritingTo: logURL)
    try log.seekToEnd()
    process.standardError = log
    try process.run()
    if awaitClipboard {
        try acknowledgement.fileHandleForWriting.close()
        let response = acknowledgement.fileHandleForReading.readDataToEndOfFile()
        try acknowledgement.fileHandleForReading.close()
        guard String(decoding: response, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines) == "{\"copied\":true}" else {
            throw NSError(domain: "SnapAndGrab", code: 3, userInfo: [NSLocalizedDescriptionKey: "Could not copy the selected screenshots. They may have changed or become unreadable."])
        }
    }
}

@raycast func launchCapture(folder: String, supportPath: String, previews: Bool, confirmationDuration: Double) throws {
    try spawn("captureSession", arguments: [try encoded(screenshotFolder(folder)), try encoded(supportPath), try encoded(previews), try encoded(confirmationDuration), try encoded(CGEventSource.flagsState(.hidSystemState).rawValue), try encoded(ProcessInfo.processInfo.systemUptime)], supportPath: supportPath)
}

@raycast func captureSession(folder: String, supportPath: String, previews: Bool, confirmationDuration: Double, initialFlags: UInt64, requestedAt: Double) throws {
    try runCaptureSession(folderPath: folder, supportPath: supportPath, previews: previews, confirmationDuration: confirmationDuration, initialFlags: initialFlags, requestedAt: requestedAt)
}

@raycast func listScreenshots(folder: String, limit: Int) throws -> ScreenshotListing {
    let prefix = UserDefaults(suiteName: "com.apple.screencapture")?.string(forKey: "name") ?? "Screenshot"
    let resolved = screenshotFolder(folder)
    let screenshots = try recentScreenshotFiles(in: URL(fileURLWithPath: resolved), excluding: nil, screenshotPrefix: prefix)
        .prefix(max(0, min(limit, 1000))).map { url in
            let values = try url.resourceValues(forKeys: [.contentModificationDateKey, .creationDateKey])
            return ScreenshotMetadata(path: url.path, name: url.lastPathComponent, modifiedAt: ISO8601DateFormatter().string(from: values.contentModificationDate ?? values.creationDate ?? .distantPast))
        }
    return ScreenshotListing(folder: resolved, screenshots: screenshots)
}

private func validate(_ paths: [String]) throws -> [URL] {
    guard !paths.isEmpty else { throw NSError(domain: "SnapAndGrab", code: 1, userInfo: [NSLocalizedDescriptionKey: "Select at least one screenshot"] ) }
    let files = paths.map { URL(fileURLWithPath: $0) }
    try validateCaptureFiles(files)
    return files
}

@raycast func copyFiles(paths: [String], supportPath: String, confirmationDuration: Double, previews: Bool) throws {
    _ = try validate(paths)
    try spawn("clipboardSession", arguments: [try encoded(paths), try encoded(confirmationDuration), try encoded(previews)], supportPath: supportPath, awaitClipboard: true)
}

@raycast func clipboardSession(paths: [String], confirmationDuration: Double, previews: Bool) throws {
    let files = try validate(paths)
    let app = NSApplication.shared
    app.setActivationPolicy(.accessory)
    let hud = SelectionHUD()
    hud.previewsEnabled = previews
    DistributedNotificationCenter.default().postNotificationName(
        dismissHUDNotification, object: notificationObject, userInfo: nil, deliverImmediately: true)
    var dismissed = false
    var transferred = false
    let dismissObserver = DistributedNotificationCenter.default().addObserver(
        forName: dismissHUDNotification, object: notificationObject, queue: .main
    ) { _ in
        dismissed = true
        hud.hide()
        if transferred { exit(0) }
    }
    _ = dismissObserver
    try publishCaptureBatch(files, to: .general)
    let publishedChange = NSPasteboard.general.changeCount
    completeClipboardTransfer {
        transferred = true
        FileHandle.standardOutput.write(Data("{\"copied\":true}\n".utf8))
        try? FileHandle.standardOutput.close()
        let seconds = max(0, min(10, confirmationDuration))
        guard !dismissed, seconds > 0, NSPasteboard.general.changeCount == publishedChange else { exit(0) }
        hud.updateCopied(files: files)
        hud.show()
        Timer.scheduledTimer(withTimeInterval: seconds, repeats: false) { _ in hud.hide(); exit(0) }
    }
    app.run()
}
