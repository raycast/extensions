import AVFoundation
import Foundation
import Speech

enum PostProcessingError: LocalizedError {
    case encoderMissing
    case encodingFailed(String)
    case speechUnavailable
    case localeUnsupported(String)
    case localeNotInstalled(String)
    case assetInstallationFailed(String)

    var errorDescription: String? {
        switch self {
        case .encoderMissing:
            "The bundled MP3 encoder is missing. Rebuild Meeting Capture."
        case let .encodingFailed(message):
            "MP3 encoding failed: \(message)"
        case .speechUnavailable:
            "On-device Apple speech transcription is unavailable on this device."
        case let .localeUnsupported(locale):
            "Apple's on-device transcribers do not support \(locale) on this device. The MP3 was saved; choose another Transcript Language."
        case let .localeNotInstalled(locale):
            "The Apple on-device speech model for \(locale) is not installed. The MP3 was saved; install the language model and try again."
        case let .assetInstallationFailed(message):
            message
        }
    }
}

func mergeAudioSegments(_ segmentURLs: [URL], to outputURL: URL) async throws {
    guard !segmentURLs.isEmpty else {
        throw PostProcessingError.encodingFailed("no recorded audio segments")
    }
    if segmentURLs.count == 1 {
        try FileManager.default.copyItem(at: segmentURLs[0], to: outputURL)
        return
    }
    let composition = AVMutableComposition()
    guard let compositionTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        throw PostProcessingError.encodingFailed("could not create audio composition")
    }
    var insertionTime = CMTime.zero
    for url in segmentURLs {
        let asset = AVURLAsset(url: url)
        guard let track = try await asset.loadTracks(withMediaType: .audio).first else { continue }
        let duration = try await asset.load(.duration)
        try compositionTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: track, at: insertionTime)
        insertionTime = CMTimeAdd(insertionTime, duration)
    }
    guard insertionTime > .zero else {
        throw PostProcessingError.encodingFailed("recorded segments contain no audio")
    }
    guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetAppleM4A) else {
        throw PostProcessingError.encodingFailed("could not create segment exporter")
    }
    try await exporter.export(to: outputURL, as: .m4a)
}

func encodeMP3(from inputURL: URL, to outputURL: URL) async throws {
    guard let encoderURL = Bundle.main.resourceURL?.appendingPathComponent("lame"),
          FileManager.default.isExecutableFile(atPath: encoderURL.path)
    else { throw PostProcessingError.encoderMissing }

    let workDirectory = outputURL.deletingLastPathComponent()
        .appendingPathComponent(".meeting-capture-\(UUID().uuidString)", isDirectory: true)
    try FileManager.default.createDirectory(at: workDirectory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: workDirectory) }
    let waveURL = workDirectory.appendingPathComponent("source.wav")
    let encodedURL = workDirectory.appendingPathComponent("encoded.mp3")

    do {
        let audioTracks = try await AVURLAsset(url: inputURL).loadTracks(withMediaType: .audio)
        guard !audioTracks.isEmpty else {
            throw PostProcessingError.encodingFailed("the recording contains no readable audio track")
        }
    } catch let error as PostProcessingError {
        throw error
    } catch {
        throw PostProcessingError.encodingFailed("the finalized recording is unreadable: \(error.localizedDescription)")
    }

    try await runProcess(
        executable: URL(fileURLWithPath: "/usr/bin/afconvert"),
        arguments: ["-f", "WAVE", "-d", "LEI16", "-c", "2", inputURL.path, waveURL.path],
        failureContext: "Audio conversion failed"
    )
    try await runProcess(
        executable: encoderURL,
        arguments: ["--silent", "-V", "4", waveURL.path, encodedURL.path],
        failureContext: "Bundled MP3 encoder failed"
    )
    try FileManager.default.moveItem(at: encodedURL, to: outputURL)
}

private struct ResolvedTranscriber {
    let locale: Locale
    let engine: TranscriberEngine
}

func transcribeOnDevice(
    audioURL: URL,
    transcriptURL: URL,
    mode: TranscriptLanguageMode,
    progress: @MainActor @escaping (String) -> Void = { _ in }
) async throws -> String {
    var resolved: [ResolvedTranscriber] = []
    for identifier in mode.requestedLocaleIdentifiers {
        let requested = Locale(identifier: identifier)
        let speechLocale = SpeechTranscriber.isAvailable
            ? await SpeechTranscriber.supportedLocale(equivalentTo: requested)
            : nil
        let dictationLocale = await DictationTranscriber.supportedLocale(equivalentTo: requested)
        guard let engine = selectTranscriberEngine(
            speechSupported: speechLocale != nil,
            dictationSupported: dictationLocale != nil
        ), let locale = engine == .speechTranscriber ? speechLocale : dictationLocale else {
            throw PostProcessingError.localeUnsupported(identifier)
        }
        resolved.append(.init(locale: locale, engine: engine))
    }

    var allSegments: [TranscriptSegment] = []
    for item in resolved {
        switch item.engine {
        case .speechTranscriber:
            let module = SpeechTranscriber(
                locale: item.locale,
                transcriptionOptions: [],
                reportingOptions: [.alternativeTranscriptions],
                attributeOptions: [.audioTimeRange, .transcriptionConfidence]
            )
            if !(await localeIsInstalled(item.locale, engine: item.engine)) {
                try await ensureModelInstalled(module: module, locale: item.locale, progress: progress)
            }
            allSegments += try await transcribeSpeechPass(audioURL: audioURL, locale: item.locale, transcriber: module)
        case .dictationTranscriber:
            let module = DictationTranscriber(
                locale: item.locale,
                contentHints: [.farField],
                transcriptionOptions: [.punctuation],
                reportingOptions: [.alternativeTranscriptions],
                attributeOptions: [.audioTimeRange, .transcriptionConfidence]
            )
            if !(await localeIsInstalled(item.locale, engine: item.engine)) {
                try await ensureModelInstalled(module: module, locale: item.locale, progress: progress)
            }
            allSegments += try await transcribeDictationPass(audioURL: audioURL, locale: item.locale, transcriber: module)
        }
    }
    let merged = mergeTranscriptSegments(allSegments)
    let text = renderTranscript(merged)
    try (text + (text.isEmpty ? "" : "\n")).write(to: transcriptURL, atomically: true, encoding: .utf8)
    return resolved.map { "\($0.locale.identifier) [\($0.engine.rawValue)]" }.joined(separator: " + ")
}

private func localeIsInstalled(_ locale: Locale, engine: TranscriberEngine) async -> Bool {
    let installed: [Locale] = switch engine {
    case .speechTranscriber: await SpeechTranscriber.installedLocales
    case .dictationTranscriber: await DictationTranscriber.installedLocales
    }
    return installed.contains { $0.identifier == locale.identifier }
}

private func transcribeSpeechPass(audioURL: URL, locale: Locale, transcriber: SpeechTranscriber) async throws -> [TranscriptSegment] {
    let audioFile = try AVAudioFile(forReading: audioURL)
    let analyzer = SpeechAnalyzer(modules: [transcriber])
    let resultTask = Task<[TranscriptSegment], Error> {
        var segments: [TranscriptSegment] = []
        for try await result in transcriber.results {
            let text = String(result.text.characters).trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { continue }
            let confidences = result.text.runs.compactMap { $0.attributes.transcriptionConfidence }
            let confidence = confidences.isEmpty ? nil : confidences.reduce(0, +) / Double(confidences.count)
            segments.append(.init(
                start: result.range.start.seconds,
                end: result.range.end.seconds,
                text: text,
                localeIdentifier: locale.identifier,
                confidence: confidence,
                alternatives: result.alternatives.map { String($0.characters) }
            ))
        }
        return segments
    }
    do {
        try await analyzer.start(inputAudioFile: audioFile, finishAfterFile: true)
        try await analyzer.finalizeAndFinishThroughEndOfInput()
        return try await resultTask.value
    } catch {
        resultTask.cancel()
        await analyzer.cancelAndFinishNow()
        throw error
    }
}

private func transcribeDictationPass(audioURL: URL, locale: Locale, transcriber: DictationTranscriber) async throws -> [TranscriptSegment] {
    let audioFile = try AVAudioFile(forReading: audioURL)
    let analyzer = SpeechAnalyzer(modules: [transcriber])
    let resultTask = Task<[TranscriptSegment], Error> {
        var segments: [TranscriptSegment] = []
        for try await result in transcriber.results {
            let text = String(result.text.characters).trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { continue }
            let confidences = result.text.runs.compactMap { $0.attributes.transcriptionConfidence }
            let confidence = confidences.isEmpty ? nil : confidences.reduce(0, +) / Double(confidences.count)
            segments.append(.init(
                start: result.range.start.seconds,
                end: result.range.end.seconds,
                text: text,
                localeIdentifier: locale.identifier,
                confidence: confidence,
                alternatives: result.alternatives.map { String($0.characters) }
            ))
        }
        return segments
    }
    do {
        try await analyzer.start(inputAudioFile: audioFile, finishAfterFile: true)
        try await analyzer.finalizeAndFinishThroughEndOfInput()
        return try await resultTask.value
    } catch {
        resultTask.cancel()
        await analyzer.cancelAndFinishNow()
        throw error
    }
}

private func ensureModelInstalled(
    module: any SpeechModule,
    locale: Locale,
    progress: @MainActor @escaping (String) -> Void
) async throws {
    let modules: [any SpeechModule] = [module]
    let status = await AssetInventory.status(forModules: modules)
    let state: ModelAssetState = switch status {
    case .unsupported: .unsupported
    case .downloading: .downloading
    case .supported: .supported
    case .installed: .installed
    @unknown default: .unsupported
    }
    switch installationPlan(for: state) {
    case .ready:
        return
    case .unavailable:
        throw PostProcessingError.localeUnsupported(locale.identifier)
    case .waitForDownload:
        await progress(modelInstallMessage(language: locale.localizedString(forIdentifier: locale.identifier) ?? locale.identifier, fractionCompleted: nil))
        for _ in 0..<1200 {
            try Task.checkCancellation()
            let current = await AssetInventory.status(forModules: modules)
            if current == .installed { return }
            if current == .supported { break }
            if current == .unsupported { throw PostProcessingError.localeUnsupported(locale.identifier) }
            try await Task.sleep(for: .milliseconds(500))
        }
    case .downloadAndInstall:
        await progress(modelInstallMessage(language: locale.localizedString(forIdentifier: locale.identifier) ?? locale.identifier, fractionCompleted: nil))
    }
    do {
        guard let request = try await AssetInventory.assetInstallationRequest(supporting: modules) else {
            let speechInstalled = await SpeechTranscriber.installedLocales
            let dictationInstalled = await DictationTranscriber.installedLocales
            if (speechInstalled + dictationInstalled).contains(where: { $0.identifier == locale.identifier }) {
                return
            }
            throw PostProcessingError.assetInstallationFailed(
                modelInstallFailureMessage(language: locale.identifier, reason: "macOS did not provide an installation request")
            )
        }
        try await withThrowingTaskGroup(of: Void.self) { group in
            group.addTask { try await request.downloadAndInstall() }
            group.addTask {
                while !Task.isCancelled {
                    await progress(modelInstallMessage(language: locale.identifier, fractionCompleted: request.progress.fractionCompleted))
                    try? await Task.sleep(for: .milliseconds(250))
                }
            }
            _ = try await group.next()
            group.cancelAll()
            while let _ = try await group.next() {}
        }
        guard await AssetInventory.status(forModules: modules) == .installed else {
            throw PostProcessingError.assetInstallationFailed(
                modelInstallFailureMessage(language: locale.identifier, reason: "installation completed without making the model available")
            )
        }
    } catch is CancellationError {
        throw CancellationError()
    } catch let error as PostProcessingError {
        throw error
    } catch {
        throw PostProcessingError.assetInstallationFailed(
            modelInstallFailureMessage(language: locale.identifier, reason: error.localizedDescription)
        )
    }
}

private func runProcess(executable: URL, arguments: [String], failureContext: String) async throws {
    let process = Process()
    let errorPipe = Pipe()
    process.executableURL = executable
    process.arguments = arguments
    process.standardOutput = FileHandle.nullDevice
    process.standardError = errorPipe
    try process.run()
    process.waitUntilExit()
    guard process.terminationStatus == 0 else {
        let data = try errorPipe.fileHandleForReading.readToEnd() ?? Data()
        let message = String(decoding: data, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)
        let detail = message.isEmpty ? "exit status \(process.terminationStatus)" : message
        throw PostProcessingError.encodingFailed("\(failureContext): \(detail)")
    }
}
