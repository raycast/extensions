import Foundation
import Testing
@testable import MeetingCaptureHelper

@Test func onlyPermissionErrorsRequirePermission() {
    #expect(RecorderError.screenPermission.phase == .permissionRequired)
    #expect(RecorderError.microphonePermission.phase == .permissionRequired)
    let failures: [RecorderError] = [.usage, .noDisplay, .noSupportedFileType, .captureFailed("Stream failed"), .processingFailed("Encoding failed")]
    for error in failures {
        #expect(error.phase == .failed)
    }
}

@Test func safeFilenameHasNoPathSeparators() {
    let url = safeRecordingURL(in: URL(fileURLWithPath: "/tmp"), date: Date(timeIntervalSince1970: 0), fileExtension: "mp3")
    #expect(url.lastPathComponent.hasPrefix("Meeting_"))
    #expect(url.pathExtension == "mp3")
    #expect(!url.lastPathComponent.contains(":"))
    #expect(pairedTranscriptURL(for: url).lastPathComponent == url.deletingPathExtension().lastPathComponent + ".txt")
}

@Test func safeFilenameAvoidsCollisions() throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let date = Date(timeIntervalSince1970: 0)
    let first = safeRecordingURL(in: directory, date: date, fileExtension: "mp3")
    try Data().write(to: first)
    let second = safeRecordingURL(in: directory, date: date, fileExtension: "mp3")
    #expect(first != second)
    #expect(second.deletingPathExtension().lastPathComponent.hasSuffix("_2"))
}

@Test func transitionMatrixAllowsOnlyValidControls() {
    let phases: [CaptureState.Phase] = [.starting, .recording, .paused, .finalizing, .transcribing, .stopped, .permissionRequired, .failed]
    for phase in phases {
        #expect(transitionAllowed(command: .pause, from: phase) == (phase == .recording))
        #expect(transitionAllowed(command: .continue, from: phase) == (phase == .paused))
        #expect(transitionAllowed(command: .stop, from: phase) == (phase == .recording || phase == .paused))
    }
}

@Test func elapsedTimeFreezesWhilePaused() {
    let origin = Date(timeIntervalSince1970: 100)
    #expect(capturedElapsed(accumulated: 8, runningSince: nil, now: origin.addingTimeInterval(90)) == 8)
    #expect(capturedElapsed(accumulated: 8, runningSince: origin, now: origin.addingTimeInterval(5)) == 13)
}

@Test func legacyStateWithoutControlFieldsStillDecodes() throws {
    let data = Data(#"{"phase":"recording","pid":42,"outputPath":"/tmp/old.mp4","updatedAt":"1970-01-01T00:00:00Z"}"#.utf8)
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    let state = try decoder.decode(CaptureState.self, from: data)
    #expect(state.phase == .recording)
    #expect(state.requestID == nil)
    #expect(state.elapsedSeconds == nil)
}
