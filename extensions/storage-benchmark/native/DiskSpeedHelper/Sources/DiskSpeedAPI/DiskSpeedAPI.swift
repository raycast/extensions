import Darwin
import DiskSpeedCore
import Foundation
import RaycastSwiftMacros

@raycast func runBenchmark(
    testIdentifier: String,
    temporaryFileIdentifier: String,
    directory: String,
    maxBytes: UInt64,
    warmupBytes: UInt64,
    targetDurationSeconds: Double,
    chunkSizeBytes: Int,
    progressFilePath: String,
    cancellationFilePath: String
) throws -> BenchmarkResult {
    guard let identifier = UUID(uuidString: temporaryFileIdentifier) else {
        throw RaycastBenchmarkError("The benchmark run identifier is invalid")
    }
    guard let benchmarkCase = BenchmarkCaseRegistry.standard.benchmarkCase(named: testIdentifier) else {
        throw RaycastBenchmarkError("Unsupported benchmark test '\(testIdentifier)'")
    }

    let progressRecorder = ProgressRecorder(filePath: progressFilePath)
    let cancellation = CancellationMonitor(markerPath: cancellationFilePath)
    let configuration = BenchmarkConfiguration(
        directory: URL(fileURLWithPath: directory, isDirectory: true),
        maxBytes: maxBytes,
        warmupBytes: warmupBytes,
        targetDurationSeconds: targetDurationSeconds,
        chunkSizeBytes: chunkSizeBytes,
        temporaryFileIdentifier: identifier
    )

    progressRecorder.record(
        .started(methodologyVersion: benchmarkCase.methodologyVersion, maxBytes: configuration.maxBytes)
    )

    do {
        return try benchmarkCase.run(
            configuration: configuration,
            onProgress: progressRecorder.record,
            isCancelled: cancellation.isCancelled
        )
    } catch BenchmarkRunnerError.cancelled {
        progressRecorder.record(.cancelled())
        throw RaycastBenchmarkError("Benchmark cancelled")
    } catch {
        let message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        progressRecorder.record(.failed(code: "benchmark_failed", message: message))
        throw RaycastBenchmarkError(message)
    }
}

private struct RaycastBenchmarkError: Error, CustomStringConvertible {
    let description: String

    init(_ description: String) {
        self.description = description
    }
}

private final class ProgressRecorder: @unchecked Sendable {
    private static let minimumIntervalNanoseconds: UInt64 = 100_000_000

    private let fileURL: URL
    private var lastPhase: BenchmarkPhase?
    private var lastWriteNanoseconds: UInt64 = 0

    init(filePath: String) {
        fileURL = URL(fileURLWithPath: filePath)
    }

    func record(_ progress: BenchmarkProgress) {
        let now = DispatchTime.now().uptimeNanoseconds
        let phaseChanged = progress.phase != lastPhase
        let intervalElapsed = now &- lastWriteNanoseconds >= Self.minimumIntervalNanoseconds
        guard phaseChanged || intervalElapsed || progress.fractionCompleted >= 1 else { return }

        lastPhase = progress.phase
        lastWriteNanoseconds = now
        record(.progress(progress))
    }

    func record(_ event: BenchmarkEvent) {
        guard let data = try? event.jsonLine().data(using: .utf8) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}

private final class CancellationMonitor: @unchecked Sendable {
    private let markerPath: String
    private let lock = NSLock()
    private var signalReceived = false
    private let interruptSource: DispatchSourceSignal
    private let terminateSource: DispatchSourceSignal

    init(markerPath: String) {
        self.markerPath = markerPath

        signal(SIGINT, SIG_IGN)
        signal(SIGTERM, SIG_IGN)

        interruptSource = DispatchSource.makeSignalSource(signal: SIGINT, queue: .global(qos: .userInitiated))
        terminateSource = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .global(qos: .userInitiated))
        interruptSource.setEventHandler { [weak self] in self?.cancel() }
        terminateSource.setEventHandler { [weak self] in self?.cancel() }
        interruptSource.resume()
        terminateSource.resume()
    }

    deinit {
        interruptSource.cancel()
        terminateSource.cancel()
    }

    func isCancelled() -> Bool {
        lock.lock()
        let received = signalReceived
        lock.unlock()
        return received || FileManager.default.fileExists(atPath: markerPath)
    }

    private func cancel() {
        lock.lock()
        signalReceived = true
        lock.unlock()
    }
}
