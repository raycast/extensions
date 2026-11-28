import AVFoundation
import Foundation
import Testing
@testable import MeetingCaptureHelper

@Test func recordingCompletionWaitsPastOldFixedDelay() async throws {
    let delegate = RecordingDelegate()
    let clock = ContinuousClock()
    let started = clock.now
    let finish = Task {
        try await Task.sleep(for: .milliseconds(650))
        delegate.markFinished()
    }
    try await delegate.waitForCompletion(timeout: .seconds(2))
    try await finish.value
    #expect(clock.now - started >= .milliseconds(650))
}

@Test func recordingCompletionHandlesCallbackBeforeWait() async throws {
    let delegate = RecordingDelegate()
    delegate.markFinished()
    try await delegate.waitForCompletion(timeout: .zero)
}

@Test func recordingCompletionTimesOutWithoutTreatingFileAsFinished() async {
    let delegate = RecordingDelegate()
    await #expect(throws: RecorderError.self) {
        try await delegate.waitForCompletion(timeout: .milliseconds(40))
    }
}

@Test func recoveryKeepsCompletedAndCurrentSegmentsAndOriginals() throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let completed = directory.appendingPathComponent(".completed.m4a")
    let current = directory.appendingPathComponent(".current.m4a")
    try Data([1, 2]).write(to: completed)
    try Data([3, 4]).write(to: current)
    let recording = directory.appendingPathComponent("Meeting.mp3")
    let message = preserveRecordingSources([completed, current, completed], beside: recording)
    let recovery = directory.appendingPathComponent("Meeting.recovery")
    #expect(message.contains(recovery.path))
    #expect(try Data(contentsOf: completed) == Data([1, 2]))
    #expect(try Data(contentsOf: current) == Data([3, 4]))
    #expect(try Data(contentsOf: recovery.appendingPathComponent("completed.m4a")) == Data([1, 2]))
    #expect(try Data(contentsOf: recovery.appendingPathComponent("current.m4a")) == Data([3, 4]))
}

@Test func recoveryFailureReportsOriginalPath() throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let source = directory.appendingPathComponent(".source.m4a")
    try Data([1]).write(to: source)
    try Data().write(to: directory.appendingPathComponent("Meeting.recovery"))
    let message = preserveRecordingSources([source], beside: directory.appendingPathComponent("Meeting.mp3"))
    #expect(message.contains(source.path))
    #expect(try Data(contentsOf: source) == Data([1]))
}

@Test func mergingRejectsUnreadableSegmentAndPreservesInputs() async throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let source = directory.appendingPathComponent("bad.m4a")
    try Data("damaged recording".utf8).write(to: source)
    do {
        try await mergeAudioSegments([source], to: directory.appendingPathComponent("merged.m4a"))
        Issue.record("Unreadable recording was accepted")
    } catch {
        #expect(try Data(contentsOf: source) == Data("damaged recording".utf8))
    }
}

@Test func mergingRejectsVideoOnlyInputInsteadOfDroppingIt() async throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let video = directory.appendingPathComponent("video-only.mov")
    let writer = try AVAssetWriter(outputURL: video, fileType: .mov)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: 16,
        AVVideoHeightKey: 16,
    ])
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
        kCVPixelBufferWidthKey as String: 16,
        kCVPixelBufferHeightKey as String: 16,
    ])
    writer.add(input)
    #expect(writer.startWriting())
    writer.startSession(atSourceTime: .zero)
    var buffer: CVPixelBuffer?
    #expect(CVPixelBufferCreate(nil, 16, 16, kCVPixelFormatType_32ARGB, nil, &buffer) == kCVReturnSuccess)
    while !input.isReadyForMoreMediaData { try await Task.sleep(for: .milliseconds(10)) }
    #expect(adaptor.append(try #require(buffer), withPresentationTime: .zero))
    input.markAsFinished()
    await writer.finishWriting()
    #expect(writer.status == .completed)
    #expect(try await AVURLAsset(url: video).loadTracks(withMediaType: .audio).isEmpty)
    let audio = directory.appendingPathComponent("valid.wav")
    try writeAudioFixture(to: audio)
    for sources in [[video], [audio, video], [video, audio]] {
        do {
            try await mergeAudioSegments(sources, to: directory.appendingPathComponent("merged.m4a"))
            Issue.record("Video-only segment was silently accepted")
        } catch let error as PostProcessingError {
            #expect(error.localizedDescription.contains("no audio track"))
        }
    }
    #expect(FileManager.default.fileExists(atPath: video.path))
}


@Test func recordingCompletionPropagatesFailureInsteadOfSuccess() async {
    let delegate = RecordingDelegate()
    delegate.markFinished()
    delegate.recordFailure(NSError(domain: "RecordingTest", code: 1, userInfo: [NSLocalizedDescriptionKey: "Disk full"]))
    await #expect(throws: RecorderError.self) {
        try await delegate.waitForCompletion(timeout: .zero)
    }
}

@Test func cancelledRecordingWaitDoesNotHang() async throws {
    let delegate = RecordingDelegate()
    let waiter = Task { try await delegate.waitForCompletion() }
    waiter.cancel()
    await #expect(throws: CancellationError.self) { try await waiter.value }
}

@Test func validSegmentsMergeWithoutDroppingAudio() async throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    var sources: [URL] = []
    for index in 0..<2 {
        let source = directory.appendingPathComponent("segment-\(index).wav")
        try writeAudioFixture(to: source)
        sources.append(source)
    }
    let output = directory.appendingPathComponent("merged.m4a")
    try await mergeAudioSegments(sources, to: output)
    let duration = try await AVURLAsset(url: output).load(.duration)
    #expect(abs(duration.seconds - 2) < 0.1)
    #expect(sources.allSatisfy { FileManager.default.fileExists(atPath: $0.path) })
    let single = directory.appendingPathComponent("single.wav")
    try await mergeAudioSegments([sources[0]], to: single)
    #expect(try Data(contentsOf: single) == Data(contentsOf: sources[0]))
}


private func writeAudioFixture(to url: URL) throws {
    let format = try #require(AVAudioFormat(standardFormatWithSampleRate: 48_000, channels: 1))
    let file = try AVAudioFile(forWriting: url, settings: format.settings)
    let buffer = try #require(AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 48_000))
    buffer.frameLength = 48_000
    let samples = try #require(buffer.floatChannelData)[0]
    for frame in 0..<48_000 { samples[frame] = Float(sin(Double(frame) * 2 * .pi * 440 / 48_000)) * 0.1 }
    try file.write(from: buffer)
}
