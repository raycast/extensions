import Foundation

struct CaptureState: Codable, Equatable {
    enum Phase: String, Codable { case starting, recording, paused, finalizing, transcribing, stopped, permissionRequired, failed }
    var phase: Phase
    var pid: Int32
    var outputPath: String?
    var transcriptPath: String?
    var message: String?
    var requestID: String?
    var elapsedSeconds: Double?
    var updatedAt: Date
}

enum CaptureCommand: String, Codable, CaseIterable { case pause, `continue`, stop }

struct ControlRequest: Codable, Equatable {
    let id: String
    let command: CaptureCommand
}

func transitionAllowed(command: CaptureCommand, from phase: CaptureState.Phase) -> Bool {
    switch (command, phase) {
    case (.pause, .recording), (.continue, .paused), (.stop, .recording), (.stop, .paused): true
    default: false
    }
}

func capturedElapsed(accumulated: TimeInterval, runningSince: Date?, now: Date = Date()) -> TimeInterval {
    accumulated + (runningSince.map { max(0, now.timeIntervalSince($0)) } ?? 0)
}

func nextControlRequest(in directory: URL) -> ControlRequest? {
    let manager = FileManager.default
    guard let urls = try? manager.contentsOfDirectory(
        at: directory,
        includingPropertiesForKeys: [.creationDateKey],
        options: [.skipsHiddenFiles]
    ) else { return nil }
    let ordered = urls.filter { $0.pathExtension == "json" }.sorted { lhs, rhs in
        let l = (try? lhs.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast
        let r = (try? rhs.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast
        return l == r ? lhs.lastPathComponent < rhs.lastPathComponent : l < r
    }
    guard let url = ordered.first else { return nil }
    defer { try? manager.removeItem(at: url) }
    guard let data = try? Data(contentsOf: url) else { return nil }
    return try? JSONDecoder().decode(ControlRequest.self, from: data)
}

func writeState(_ state: CaptureState, to url: URL) throws {
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    let data = try encoder.encode(state)
    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try data.write(to: url, options: .atomic)
}

func safeRecordingURL(in directory: URL, date: Date = Date(), fileExtension: String) -> URL {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    formatter.dateFormat = "yyyy-MM-dd_HH-mm-ss"
    let basename = "Meeting_\(formatter.string(from: date))"
    var candidate = directory.appendingPathComponent("\(basename).\(fileExtension)")
    var suffix = 2
    while FileManager.default.fileExists(atPath: candidate.path) {
        candidate = directory.appendingPathComponent("\(basename)_\(suffix).\(fileExtension)")
        suffix += 1
    }
    return candidate
}

func pairedTranscriptURL(for recordingURL: URL) -> URL {
    recordingURL.deletingPathExtension().appendingPathExtension("txt")
}
