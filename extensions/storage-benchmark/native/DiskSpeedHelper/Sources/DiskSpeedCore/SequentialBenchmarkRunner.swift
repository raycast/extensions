import Darwin
import Foundation

public struct BenchmarkConfiguration: Equatable, Sendable {
    public let directory: URL
    public let maxBytes: UInt64
    public let warmupBytes: UInt64
    public let targetDurationSeconds: Double
    public let chunkSizeBytes: Int
    public let temporaryFileIdentifier: UUID

    public init(
        directory: URL,
        maxBytes: UInt64,
        warmupBytes: UInt64 = 32 * 1_048_576,
        targetDurationSeconds: Double = 10,
        chunkSizeBytes: Int = 4 * 1_048_576,
        temporaryFileIdentifier: UUID = UUID()
    ) {
        self.directory = directory
        self.maxBytes = maxBytes
        self.warmupBytes = warmupBytes
        self.targetDurationSeconds = targetDurationSeconds
        self.chunkSizeBytes = chunkSizeBytes
        self.temporaryFileIdentifier = temporaryFileIdentifier
    }
}

public struct SequentialBenchmarkRunner: Sendable {
    public static let methodologyVersion = "sequential-v1"
    public static let temporaryFilePrefix = ".raycast-disk-speed-v1-"
    public static let maximumBenchmarkBytes: UInt64 = 25 * 1_073_741_824
    public static let maximumTargetDurationSeconds: Double = 60

    public init() {}

    public func run(
        configuration: BenchmarkConfiguration,
        onProgress: @escaping (BenchmarkProgress) -> Void = { _ in },
        isCancelled: @escaping () -> Bool = { false }
    ) throws -> BenchmarkResult {
        try validate(configuration)
        let volume = try BenchmarkDestinationInspector().inspect(configuration)
        onProgress(BenchmarkProgress(phase: .preparing, bytesProcessed: 0, totalBytes: 1, throughputMBps: 0))

        let patternBytes = Int(min(configuration.maxBytes, UInt64(64 * 1_048_576)))
        let buffer = try AlignedBuffer(byteCount: max(configuration.chunkSizeBytes, patternBytes))
        buffer.fillDeterministicHighEntropyData()
        let transferExecutor = SequentialTransferExecutor(
            configuration: configuration,
            buffer: buffer,
            onProgress: onProgress,
            isCancelled: isCancelled
        )

        let fileURL = configuration.directory.appendingPathComponent(
            "\(Self.temporaryFilePrefix)\(configuration.temporaryFileIdentifier.uuidString).tmp"
        )
        defer {
            unlink(fileURL.path)
            onProgress(BenchmarkProgress(phase: .cleanup, bytesProcessed: 1, totalBytes: 1, throughputMBps: 0))
        }

        let writeDescriptor = open(
            fileURL.path,
            O_CREAT | O_EXCL | O_RDWR | O_TRUNC,
            S_IRUSR | S_IWUSR
        )
        guard writeDescriptor >= 0 else {
            throw BenchmarkRunnerError.posix(operation: "create benchmark file", code: errno)
        }

        do {
            defer { close(writeDescriptor) }
            try disableCache(for: writeDescriptor)

            if configuration.warmupBytes > 0 {
                _ = try transferExecutor.transfer(
                    descriptor: writeDescriptor,
                    direction: .write,
                    phase: .warmup,
                    maximumBytes: min(configuration.warmupBytes, configuration.maxBytes),
                    flushToMedia: false
                )
                guard fsync(writeDescriptor) == 0 else {
                    throw BenchmarkRunnerError.posix(operation: "flush warm-up data", code: errno)
                }
                guard ftruncate(writeDescriptor, 0) == 0, lseek(writeDescriptor, 0, SEEK_SET) == 0 else {
                    throw BenchmarkRunnerError.posix(operation: "reset benchmark file", code: errno)
                }
            }

            let writeSample = try transferExecutor.transfer(
                descriptor: writeDescriptor,
                direction: .write,
                phase: .write,
                maximumBytes: configuration.maxBytes,
                flushToMedia: true
            )

            let readDescriptor = open(fileURL.path, O_RDONLY)
            guard readDescriptor >= 0 else {
                throw BenchmarkRunnerError.posix(operation: "open benchmark file for reading", code: errno)
            }

            let readSample: TransferSample
            do {
                defer { close(readDescriptor) }
                try disableCache(for: readDescriptor)
                readSample = try transferExecutor.transfer(
                    descriptor: readDescriptor,
                    direction: .read,
                    phase: .read,
                    maximumBytes: writeSample.bytes,
                    flushToMedia: false
                )
            }

            let hasEnoughStabilityData = writeSample.stabilityWindowCount > 1 && readSample.stabilityWindowCount > 1
            let confidence = hasEnoughStabilityData
                ? confidenceForVariation(max(writeSample.variation, readSample.variation))
                : .low
            return BenchmarkResult(
                methodologyVersion: Self.methodologyVersion,
                maxBytes: configuration.maxBytes,
                measuredBytes: min(writeSample.bytes, readSample.bytes),
                write: writeSample.measurement,
                read: readSample.measurement,
                confidence: confidence,
                volume: volume
            )
        }
    }

    private func validate(_ configuration: BenchmarkConfiguration) throws {
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: configuration.directory.path, isDirectory: &isDirectory),
              isDirectory.boolValue
        else {
            throw BenchmarkRunnerError.invalidConfiguration("Benchmark destination must be an existing directory")
        }
        guard configuration.maxBytes > 0 else {
            throw BenchmarkRunnerError.invalidConfiguration("Maximum bytes must be greater than 0")
        }
        guard configuration.maxBytes <= Self.maximumBenchmarkBytes else {
            throw BenchmarkRunnerError.invalidConfiguration("Maximum bytes must be at most 25 GiB")
        }
        guard configuration.maxBytes.isMultiple(of: 4_096) else {
            throw BenchmarkRunnerError.invalidConfiguration("Maximum bytes must be 4 KiB aligned")
        }
        guard configuration.warmupBytes.isMultiple(of: 4_096) else {
            throw BenchmarkRunnerError.invalidConfiguration("Warm-up bytes must be 4 KiB aligned")
        }
        guard configuration.targetDurationSeconds > 0,
              configuration.targetDurationSeconds <= Self.maximumTargetDurationSeconds
        else {
            throw BenchmarkRunnerError.invalidConfiguration("Target duration must be greater than 0 and at most 60 seconds")
        }
        guard configuration.chunkSizeBytes >= 4_096,
              configuration.chunkSizeBytes.isMultiple(of: 4_096),
              UInt64(configuration.chunkSizeBytes) <= configuration.maxBytes
        else {
            throw BenchmarkRunnerError.invalidConfiguration(
                "Chunk size must be 4 KiB aligned and no larger than the maximum bytes"
            )
        }
    }

    private func disableCache(for descriptor: Int32) throws {
        guard fcntl(descriptor, F_NOCACHE, 1) != -1 else {
            throw BenchmarkRunnerError.posix(operation: "disable file cache", code: errno)
        }
    }

    private func confidenceForVariation(_ variation: Double) -> BenchmarkConfidence {
        switch variation {
        case ...0.08: .high
        case ...0.15: .medium
        default: .low
        }
    }
}

public enum BenchmarkRunnerError: Error, Equatable, LocalizedError {
    case cancelled
    case invalidConfiguration(String)
    case noDataMeasured
    case nonLocalVolume
    case cloudBackedLocation
    case insufficientSpace(requiredBytes: UInt64, availableBytes: UInt64)
    case posix(operation: String, code: Int32)
    case unexpectedEndOfFile

    public var errorDescription: String? {
        switch self {
        case .cancelled:
            "Benchmark cancelled"
        case let .invalidConfiguration(message):
            message
        case .noDataMeasured:
            "The benchmark completed without measuring any data"
        case .nonLocalVolume:
            "The selected destination is not on a local volume"
        case .cloudBackedLocation:
            "The selected destination is cloud backed and cannot be benchmarked"
        case let .insufficientSpace(requiredBytes, availableBytes):
            "The destination needs \(requiredBytes) free bytes but only \(availableBytes) are available"
        case let .posix(operation, code):
            "Unable to \(operation): \(String(cString: strerror(code)))"
        case .unexpectedEndOfFile:
            "The benchmark file ended before all written data could be read"
        }
    }
}
