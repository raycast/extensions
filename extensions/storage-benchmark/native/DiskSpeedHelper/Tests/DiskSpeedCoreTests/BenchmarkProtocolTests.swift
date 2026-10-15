import Testing
@testable import DiskSpeedCore

@Test("standard benchmark registry exposes the selectable sequential case")
func standardRegistryExposesSequentialCase() {
    let registry = BenchmarkCaseRegistry.standard

    #expect(registry.supportedIdentifiers == ["sequential"])
    #expect(registry.benchmarkCase(named: "sequential")?.methodologyVersion == "sequential-v1")
}

@Test("started event is a deterministic versioned JSON line")
func startedEventIsVersionedJSONLine() throws {
    let event = BenchmarkEvent.started(methodologyVersion: "sequential-v1", maxBytes: 1_048_576)

    #expect(
        try event.jsonLine()
            == #"{"maxBytes":1048576,"methodologyVersion":"sequential-v1","protocolVersion":1,"type":"started"}"#
                + "\n"
    )
}

@Test("completed event carries a self-describing benchmark result")
func completedEventCarriesResult() throws {
    let result = BenchmarkResult(
        methodologyVersion: "sequential-v1",
        maxBytes: 2_000_000,
        measuredBytes: 2_000_000,
        write: BenchmarkMeasurement(durationSeconds: 1, megabytesPerSecond: 2, variation: 0.01),
        read: BenchmarkMeasurement(durationSeconds: 1, megabytesPerSecond: 2, variation: 0.02),
        confidence: .high
    )

    #expect(
        try BenchmarkEvent.completed(result).jsonLine()
            == #"{"protocolVersion":1,"result":{"confidence":"high","maxBytes":2000000,"measuredBytes":2000000,"methodologyVersion":"sequential-v1","read":{"durationSeconds":1,"megabytesPerSecond":2,"variation":0.02},"write":{"durationSeconds":1,"megabytesPerSecond":2,"variation":0.01}},"type":"completed"}"#
                + "\n"
    )
}

@Test("progress event exposes phase and determinate work")
func progressEventCarriesDeterminateWork() throws {
    let progress = BenchmarkProgress(
        phase: .write,
        bytesProcessed: 500,
        totalBytes: 1_000,
        throughputMBps: 100
    )

    #expect(
        try BenchmarkEvent.progress(progress).jsonLine()
            == #"{"bytesProcessed":500,"phase":"write","progress":0.5,"protocolVersion":1,"throughputMBps":100,"totalBytes":1000,"type":"progress"}"#
                + "\n"
    )
}
