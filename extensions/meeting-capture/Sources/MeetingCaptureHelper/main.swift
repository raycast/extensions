import AppKit
import AVFoundation
import CoreGraphics
import Foundation
import ScreenCaptureKit

private enum RecorderError: LocalizedError {
    case usage, screenPermission, microphonePermission, noDisplay, noSupportedFileType
    var errorDescription: String? {
        switch self {
        case .usage: "Usage: MeetingCaptureHelper record --output-directory DIR --state FILE --control-directory DIR --transcript-language MODE"
        case .screenPermission: "Screen & System Audio Recording permission is required. Grant it in System Settings, then invoke Start Meeting Capture again."
        case .microphonePermission: "Microphone permission is required. Grant it in System Settings, then invoke Start Meeting Capture again."
        case .noDisplay: "No capturable display is available."
        case .noSupportedFileType: "No supported ScreenCaptureKit recording file type is available."
        }
    }
}

private final class RecordingDelegate: NSObject, SCRecordingOutputDelegate, SCStreamDelegate {
    private(set) var failure: Error?
    func recordingOutputDidStartRecording(_ output: SCRecordingOutput) {}
    func recordingOutputDidFinishRecording(_ output: SCRecordingOutput) {}
    func recordingOutput(_ output: SCRecordingOutput, didFailWithError error: any Error) { failure = error }
    func stream(_ stream: SCStream, didStopWithError error: any Error) { failure = error }
}

@MainActor
private final class CaptureController {
    let outputDirectory: URL
    let stateURL: URL
    let controlDirectory: URL
    let transcriptLanguage: TranscriptLanguageMode
    let filter: SCContentFilter
    let config: SCStreamConfiguration
    let fileType: AVFileType
    let mp3URL: URL
    let transcriptURL: URL
    let indicator = CaptureIndicator()

    private var stream: SCStream?
    private var delegate: RecordingDelegate?
    private var currentSegmentURL: URL?
    private var segmentURLs: [URL] = []
    private var phase: CaptureState.Phase = .starting
    private var elapsedSeconds: Double = 0
    private var segmentStartedAt: Date?

    init(outputDirectory: URL, stateURL: URL, controlDirectory: URL, transcriptLanguage: TranscriptLanguageMode, filter: SCContentFilter, config: SCStreamConfiguration, fileType: AVFileType) {
        self.outputDirectory = outputDirectory
        self.stateURL = stateURL
        self.controlDirectory = controlDirectory
        self.transcriptLanguage = transcriptLanguage
        self.filter = filter
        self.config = config
        self.fileType = fileType
        mp3URL = safeRecordingURL(in: outputDirectory, fileExtension: "mp3")
        transcriptURL = pairedTranscriptURL(for: mp3URL)
    }

    func run() async throws {
        try await startSegment()
        indicator.show()
        try updateState(.recording, message: "Recording")
        while phase == .recording || phase == .paused {
            if let request = nextControlRequest(in: controlDirectory) {
                try await handle(request)
            } else {
                try await Task.sleep(for: .milliseconds(100))
            }
        }
        try await finalize()
    }

    private func handle(_ request: ControlRequest) async throws {
        guard transitionAllowed(command: request.command, from: phase) else {
            try updateState(phase, message: "\(request.command.rawValue.capitalized) is not available while \(phase.rawValue).", requestID: request.id)
            return
        }
        switch request.command {
        case .pause:
            try await stopSegment()
            phase = .paused
            indicator.pause()
            try updateState(.paused, message: "Paused", requestID: request.id)
        case .continue:
            try await startSegment()
            phase = .recording
            indicator.resume()
            try updateState(.recording, message: "Recording", requestID: request.id)
        case .stop:
            if phase == .recording { try await stopSegment() }
            phase = .finalizing
            indicator.showTranscribing(mode: transcriptLanguage.displayName)
            try updateState(.finalizing, message: "Finalizing MP3", requestID: request.id)
        }
    }

    private func startSegment() async throws {
        let ext = fileType == .m4a ? "m4a" : "mp4"
        let url = outputDirectory.appendingPathComponent(".\(mp3URL.deletingPathExtension().lastPathComponent).\(UUID().uuidString).segment.\(ext)")
        let recordingConfig = SCRecordingOutputConfiguration()
        recordingConfig.outputFileType = fileType
        recordingConfig.mixesAudioWithMicrophone = true
        recordingConfig.outputURL = url
        let delegate = RecordingDelegate()
        let output = SCRecordingOutput(configuration: recordingConfig, delegate: delegate)
        let stream = SCStream(filter: filter, configuration: config, delegate: delegate)
        try stream.addRecordingOutput(output)
        try await stream.startCapture()
        self.stream = stream
        self.delegate = delegate
        currentSegmentURL = url
        segmentStartedAt = Date()
    }

    private func stopSegment() async throws {
        guard let stream, let url = currentSegmentURL else { return }
        try await stream.stopCapture()
        try await Task.sleep(for: .milliseconds(500))
        if let failure = delegate?.failure { throw failure }
        if let started = segmentStartedAt { elapsedSeconds += Date().timeIntervalSince(started) }
        segmentURLs.append(url)
        self.stream = nil
        delegate = nil
        currentSegmentURL = nil
        segmentStartedAt = nil
    }

    private func finalize() async throws {
        let mergedURL = outputDirectory.appendingPathComponent(".\(mp3URL.deletingPathExtension().lastPathComponent).\(UUID().uuidString).merged.m4a")
        defer {
            for url in segmentURLs { try? FileManager.default.removeItem(at: url) }
            try? FileManager.default.removeItem(at: mergedURL)
        }
        try await mergeAudioSegments(segmentURLs, to: mergedURL)
        try await encodeMP3(from: mergedURL, to: mp3URL)
        phase = .transcribing
        try updateState(.transcribing, message: "Transcribing on-device — \(transcriptLanguage.displayName)")
        do {
            let locale = try await transcribeOnDevice(
                audioURL: mergedURL,
                transcriptURL: transcriptURL,
                mode: transcriptLanguage
            ) { [weak self] message in
                guard let self else { return }
                self.indicator.showModelDownload(message)
                try? self.updateState(.transcribing, message: message)
            }
            phase = .stopped
            indicator.hide()
            try updateState(.stopped, message: "Transcript locale: \(locale)")
        } catch {
            phase = .stopped
            indicator.hide()
            try updateState(.stopped, message: "Audio saved; transcript failed: \(error.localizedDescription)")
        }
    }

    private func currentElapsed() -> Double {
        capturedElapsed(accumulated: elapsedSeconds, runningSince: segmentStartedAt)
    }

    private func updateState(_ phase: CaptureState.Phase, message: String, requestID: String? = nil) throws {
        self.phase = phase
        try writeState(.init(phase: phase, pid: getpid(), outputPath: mp3URL.path, transcriptPath: transcriptURL.path, message: message, requestID: requestID, elapsedSeconds: currentElapsed(), updatedAt: Date()), to: stateURL)
    }
}

@main private enum MeetingCaptureHelper {
    private struct Arguments { let outputDirectory: URL; let stateURL: URL; let controlDirectory: URL; let transcriptLanguage: TranscriptLanguageMode }

    static func main() async {
        NSApplication.shared.setActivationPolicy(.accessory)
        do { try await record(try parseArguments()) }
        catch {
            let stateURL = stateURLFromArguments() ?? URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("meeting-capture-error.json")
            let phase: CaptureState.Phase = error is RecorderError ? .permissionRequired : .failed
            try? writeState(.init(phase: phase, pid: getpid(), message: error.localizedDescription, updatedAt: Date()), to: stateURL)
            fputs("MeetingCaptureHelper: \(error.localizedDescription)\n", stderr); exit(1)
        }
    }

    private static func parseArguments() throws -> Arguments {
        let a = CommandLine.arguments
        guard a.count == 10, a[1] == "record", a[2] == "--output-directory", a[4] == "--state", a[6] == "--control-directory", a[8] == "--transcript-language" else { throw RecorderError.usage }
        return Arguments(outputDirectory: URL(fileURLWithPath: a[3], isDirectory: true), stateURL: URL(fileURLWithPath: a[5]), controlDirectory: URL(fileURLWithPath: a[7], isDirectory: true), transcriptLanguage: .parse(a[9]))
    }

    private static func stateURLFromArguments() -> URL? {
        guard let i = CommandLine.arguments.firstIndex(of: "--state"), CommandLine.arguments.indices.contains(i + 1) else { return nil }
        return URL(fileURLWithPath: CommandLine.arguments[i + 1])
    }

    private static func microphoneAllowed() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: true
        case .notDetermined: await AVCaptureDevice.requestAccess(for: .audio)
        default: false
        }
    }

    @MainActor private static func record(_ args: Arguments) async throws {
        try FileManager.default.createDirectory(at: args.outputDirectory, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: args.controlDirectory, withIntermediateDirectories: true)
        try writeState(.init(phase: .starting, pid: getpid(), message: "Requesting capture access", updatedAt: Date()), to: args.stateURL)
        guard CGPreflightScreenCaptureAccess() || CGRequestScreenCaptureAccess() else { throw RecorderError.screenPermission }
        guard await microphoneAllowed() else { throw RecorderError.microphonePermission }
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
        guard let display = content.displays.first else { throw RecorderError.noDisplay }
        let ownApp = content.applications.filter { $0.bundleIdentifier == Bundle.main.bundleIdentifier }
        let filter = SCContentFilter(display: display, excludingApplications: ownApp, exceptingWindows: [])
        let config = SCStreamConfiguration()
        config.width = 2; config.height = 2
        config.minimumFrameInterval = CMTime(value: 1, timescale: 1); config.queueDepth = 3
        config.capturesAudio = true; config.captureMicrophone = true; config.excludesCurrentProcessAudio = true
        config.sampleRate = 48_000; config.channelCount = 2
        let available = SCRecordingOutputConfiguration().availableOutputFileTypes
        guard let fileType = available.contains(.m4a) ? AVFileType.m4a : available.first else { throw RecorderError.noSupportedFileType }
        let controller = CaptureController(outputDirectory: args.outputDirectory, stateURL: args.stateURL, controlDirectory: args.controlDirectory, transcriptLanguage: args.transcriptLanguage, filter: filter, config: config, fileType: fileType)
        try await controller.run()
    }
}
