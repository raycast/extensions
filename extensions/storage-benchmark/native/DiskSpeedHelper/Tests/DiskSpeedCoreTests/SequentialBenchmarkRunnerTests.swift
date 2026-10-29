import Foundation
import Testing
@testable import DiskSpeedCore

@Test("sequential benchmark measures both directions and removes its temporary file")
func sequentialBenchmarkMeasuresAndCleansUp() throws {
    let directory = FileManager.default.temporaryDirectory
        .appendingPathComponent("disk-speed-helper-tests-\(UUID().uuidString)", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }

    let configuration = BenchmarkConfiguration(
        directory: directory,
        maxBytes: 8 * 1_048_576,
        warmupBytes: 0,
        targetDurationSeconds: 5,
        chunkSizeBytes: 1_048_576
    )

    let result = try SequentialBenchmarkRunner().run(configuration: configuration)

    #expect(result.measuredBytes == configuration.maxBytes)
    #expect(result.write.megabytesPerSecond > 0)
    #expect(result.read.megabytesPerSecond > 0)
    #expect(result.confidence == .low)
    #expect(try FileManager.default.contentsOfDirectory(atPath: directory.path).isEmpty)
}

@Test("cancelled benchmark removes its temporary file")
func cancelledBenchmarkCleansUp() throws {
    let directory = FileManager.default.temporaryDirectory
        .appendingPathComponent("disk-speed-helper-tests-\(UUID().uuidString)", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }

    let configuration = BenchmarkConfiguration(
        directory: directory,
        maxBytes: 8 * 1_048_576,
        warmupBytes: 0,
        targetDurationSeconds: 5,
        chunkSizeBytes: 1_048_576
    )

    #expect(throws: BenchmarkRunnerError.cancelled) {
        try SequentialBenchmarkRunner().run(configuration: configuration, isCancelled: { true })
    }
    #expect(try FileManager.default.contentsOfDirectory(atPath: directory.path).isEmpty)
}

@Test("sequential benchmark reports native write, read, and cleanup phases")
func sequentialBenchmarkReportsPhases() throws {
    let directory = FileManager.default.temporaryDirectory
        .appendingPathComponent("disk-speed-helper-tests-\(UUID().uuidString)", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }

    let configuration = BenchmarkConfiguration(
        directory: directory,
        maxBytes: 4 * 1_048_576,
        warmupBytes: 0,
        targetDurationSeconds: 5,
        chunkSizeBytes: 1_048_576
    )
    var phases: [BenchmarkPhase] = []

    _ = try SequentialBenchmarkRunner().run(
        configuration: configuration,
        onProgress: { phases.append($0.phase) }
    )

    #expect(phases.contains(.write))
    #expect(phases.contains(.read))
    #expect(phases.last == .cleanup)
}

@Test("benchmark result identifies the destination volume")
func benchmarkResultIdentifiesVolume() throws {
    let directory = FileManager.default.temporaryDirectory
        .appendingPathComponent("disk-speed-helper-tests-\(UUID().uuidString)", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }

    let result = try SequentialBenchmarkRunner().run(
        configuration: BenchmarkConfiguration(
            directory: directory,
            maxBytes: 4 * 1_048_576,
            warmupBytes: 0,
            targetDurationSeconds: 5,
            chunkSizeBytes: 1_048_576
        )
    )

    #expect(result.volume?.id.isEmpty == false)
    #expect(result.volume?.name.isEmpty == false)
}

@Test("benchmark rejects a byte cap that cannot support aligned uncached IO")
func benchmarkRejectsUnalignedCap() throws {
    let configuration = BenchmarkConfiguration(
        directory: FileManager.default.temporaryDirectory,
        maxBytes: 4 * 1_048_576 + 1,
        warmupBytes: 0,
        targetDurationSeconds: 5,
        chunkSizeBytes: 1_048_576
    )

    #expect(throws: BenchmarkRunnerError.invalidConfiguration("Maximum bytes must be 4 KiB aligned")) {
        try SequentialBenchmarkRunner().run(configuration: configuration)
    }
}

@Test("benchmark enforces the absolute twenty-five GiB cap")
func benchmarkRejectsCapAboveTwentyFiveGiB() throws {
    #expect(SequentialBenchmarkRunner.maximumBenchmarkBytes == 25 * 1_073_741_824)

    let configuration = BenchmarkConfiguration(
        directory: FileManager.default.temporaryDirectory,
        maxBytes: 25 * 1_073_741_824 + 4_096,
        warmupBytes: 0,
        targetDurationSeconds: 5,
        chunkSizeBytes: 1_048_576
    )

    #expect(throws: BenchmarkRunnerError.invalidConfiguration("Maximum bytes must be at most 25 GiB")) {
        try SequentialBenchmarkRunner().run(configuration: configuration, isCancelled: { true })
    }
}

@Test("benchmark enforces the one-minute time target cap")
func benchmarkRejectsTargetAboveOneMinute() throws {
    #expect(SequentialBenchmarkRunner.maximumTargetDurationSeconds == 60)

    let configuration = BenchmarkConfiguration(
        directory: FileManager.default.temporaryDirectory,
        maxBytes: 4 * 1_048_576,
        warmupBytes: 0,
        targetDurationSeconds: 61,
        chunkSizeBytes: 1_048_576
    )

    #expect(
        throws: BenchmarkRunnerError.invalidConfiguration(
            "Target duration must be greater than 0 and at most 60 seconds"
        )
    ) {
        try SequentialBenchmarkRunner().run(configuration: configuration, isCancelled: { true })
    }
}

@Test("large targets retain a ten-percent free-space margin")
func benchmarkRetainsFreeSpaceMarginForLargeTargets() throws {
    let directory = FileManager.default.temporaryDirectory
        .appendingPathComponent("disk-speed-helper-tests-\(UUID().uuidString)", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }

    let targetBytes: UInt64 = 25 * 1_073_741_824
    let configuration = BenchmarkConfiguration(
        directory: directory,
        maxBytes: targetBytes,
        warmupBytes: 0,
        targetDurationSeconds: 10,
        chunkSizeBytes: 4 * 1_048_576
    )

    #expect(
        throws: BenchmarkRunnerError.insufficientSpace(
            requiredBytes: targetBytes + targetBytes / 10,
            availableBytes: targetBytes
        )
    ) {
        try BenchmarkDestinationInspector(availableBytesOverride: Int64(targetBytes)).inspect(configuration)
    }
}

@Test("benchmark uses ordinary free space when an external volume reports zero for important usage")
func benchmarkHandlesUnsupportedImportantUsageCapacity() {
    #expect(
        BenchmarkDestinationInspector.availableBytes(
            importantUsage: 0,
            ordinary: 426_594_402_304,
            fileSystem: 426_594_402_304
        ) == 426_594_402_304
    )
}

@Test("configured external volume completes a benchmark and removes its temporary file")
func configuredExternalVolumeCompletesAndCleansUp() throws {
    guard let directoryPath = ProcessInfo.processInfo.environment["DISK_SPEED_TEST_EXTERNAL_DIRECTORY"] else {
        return
    }

    let directory = URL(fileURLWithPath: directoryPath, isDirectory: true)
    let temporaryFileIdentifier = UUID(uuidString: "00000000-0000-4000-8000-000000000125")!
    let temporaryFile = directory.appendingPathComponent(
        ".raycast-disk-speed-v1-\(temporaryFileIdentifier.uuidString).tmp"
    )
    let configuration = BenchmarkConfiguration(
        directory: directory,
        maxBytes: 256 * 1_048_576,
        warmupBytes: 0,
        targetDurationSeconds: 1,
        chunkSizeBytes: 4 * 1_048_576,
        temporaryFileIdentifier: temporaryFileIdentifier
    )

    let result = try SequentialBenchmarkRunner().run(configuration: configuration)

    #expect(result.measuredBytes > 0)
    #expect(!FileManager.default.fileExists(atPath: temporaryFile.path))
}

@Test("known macOS cloud-storage directories are classified as cloud backed")
func benchmarkClassifiesKnownCloudStorageDirectories() {
    let homeDirectory = URL(fileURLWithPath: "/Users/example", isDirectory: true)

    #expect(
        BenchmarkDestinationInspector.isKnownCloudBackedDirectory(
            URL(fileURLWithPath: "/Users/example/Library/CloudStorage/Provider/Folder", isDirectory: true),
            homeDirectory: homeDirectory
        )
    )
    #expect(
        BenchmarkDestinationInspector.isKnownCloudBackedDirectory(
            URL(fileURLWithPath: "/Users/example/Library/Mobile Documents/com~apple~CloudDocs/Folder", isDirectory: true),
            homeDirectory: homeDirectory
        )
    )
    #expect(
        !BenchmarkDestinationInspector.isKnownCloudBackedDirectory(
            URL(fileURLWithPath: "/Users/example/Documents/Folder", isDirectory: true),
            homeDirectory: homeDirectory
        )
    )
}

@Test("benchmark refuses insufficient destination space before creating a file")
func benchmarkRefusesInsufficientSpace() throws {
    let directory = FileManager.default.temporaryDirectory
        .appendingPathComponent("disk-speed-helper-tests-\(UUID().uuidString)", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }

    let configuration = BenchmarkConfiguration(
        directory: directory,
        maxBytes: 4 * 1_048_576,
        warmupBytes: 0,
        targetDurationSeconds: 5,
        chunkSizeBytes: 1_048_576
    )

    let refusedWithoutCreatingAFile: Bool
    do {
        _ = try BenchmarkDestinationInspector(availableBytesOverride: 0).inspect(configuration)
        refusedWithoutCreatingAFile = false
    } catch BenchmarkRunnerError.insufficientSpace {
        refusedWithoutCreatingAFile = try FileManager.default.contentsOfDirectory(atPath: directory.path).isEmpty
    } catch {
        refusedWithoutCreatingAFile = false
    }
    #expect(refusedWithoutCreatingAFile)
}
