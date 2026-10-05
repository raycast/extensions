import Foundation

public struct BenchmarkEvent: Encodable, Equatable, Sendable {
    private enum Payload: Equatable, Sendable {
        case started(methodologyVersion: String, maxBytes: UInt64)
        case progress(BenchmarkProgress)
        case completed(BenchmarkResult)
        case description(BenchmarkDescription)
        case cancelled
        case failed(code: String, message: String)
    }

    private enum CodingKeys: String, CodingKey {
        case type
        case protocolVersion
        case methodologyVersion
        case maxBytes
        case result
        case phase
        case bytesProcessed
        case totalBytes
        case progress
        case throughputMBps
        case description
        case code
        case message
    }

    private let payload: Payload

    private init(_ payload: Payload) {
        self.payload = payload
    }

    public static func started(methodologyVersion: String, maxBytes: UInt64) -> BenchmarkEvent {
        BenchmarkEvent(.started(methodologyVersion: methodologyVersion, maxBytes: maxBytes))
    }

    public static func completed(_ result: BenchmarkResult) -> BenchmarkEvent {
        BenchmarkEvent(.completed(result))
    }

    public static func progress(_ progress: BenchmarkProgress) -> BenchmarkEvent {
        BenchmarkEvent(.progress(progress))
    }

    public static func description(supportedTests: [String] = BenchmarkCaseRegistry.standard.supportedIdentifiers) -> BenchmarkEvent {
        BenchmarkEvent(
            .description(
                BenchmarkDescription(
                    protocolVersion: 1,
                    methodologyVersion: SequentialBenchmarkRunner.methodologyVersion,
                    supportedTests: supportedTests
                )
            )
        )
    }

    public static func cancelled() -> BenchmarkEvent {
        BenchmarkEvent(.cancelled)
    }

    public static func failed(code: String, message: String) -> BenchmarkEvent {
        BenchmarkEvent(.failed(code: code, message: message))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(1, forKey: .protocolVersion)

        switch payload {
        case let .started(methodologyVersion, maxBytes):
            try container.encode("started", forKey: .type)
            try container.encode(methodologyVersion, forKey: .methodologyVersion)
            try container.encode(maxBytes, forKey: .maxBytes)
        case let .progress(progress):
            try container.encode("progress", forKey: .type)
            try container.encode(progress.phase, forKey: .phase)
            try container.encode(progress.bytesProcessed, forKey: .bytesProcessed)
            try container.encode(progress.totalBytes, forKey: .totalBytes)
            try container.encode(progress.fractionCompleted, forKey: .progress)
            try container.encode(progress.throughputMBps, forKey: .throughputMBps)
        case let .completed(result):
            try container.encode("completed", forKey: .type)
            try container.encode(result, forKey: .result)
        case let .description(description):
            try container.encode("description", forKey: .type)
            try container.encode(description, forKey: .description)
        case .cancelled:
            try container.encode("cancelled", forKey: .type)
            try container.encode("cancelled", forKey: .code)
            try container.encode("Benchmark cancelled", forKey: .message)
        case let .failed(code, message):
            try container.encode("error", forKey: .type)
            try container.encode(code, forKey: .code)
            try container.encode(message, forKey: .message)
        }
    }

    public func jsonLine() throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        let data = try encoder.encode(self)

        guard let json = String(data: data, encoding: .utf8) else {
            throw BenchmarkProtocolError.invalidUTF8
        }

        return json + "\n"
    }
}

public struct BenchmarkDescription: Codable, Equatable, Sendable {
    public let protocolVersion: Int
    public let methodologyVersion: String
    public let supportedTests: [String]

    public init(protocolVersion: Int, methodologyVersion: String, supportedTests: [String]) {
        self.protocolVersion = protocolVersion
        self.methodologyVersion = methodologyVersion
        self.supportedTests = supportedTests
    }
}

public struct BenchmarkProgress: Equatable, Sendable {
    public let phase: BenchmarkPhase
    public let bytesProcessed: UInt64
    public let totalBytes: UInt64
    public let throughputMBps: Double

    public init(phase: BenchmarkPhase, bytesProcessed: UInt64, totalBytes: UInt64, throughputMBps: Double) {
        self.phase = phase
        self.bytesProcessed = bytesProcessed
        self.totalBytes = totalBytes
        self.throughputMBps = throughputMBps
    }

    public var fractionCompleted: Double {
        guard totalBytes > 0 else { return 0 }
        return min(1, Double(bytesProcessed) / Double(totalBytes))
    }
}

public enum BenchmarkPhase: String, Codable, Equatable, Sendable {
    case preparing
    case warmup
    case write
    case read
    case cleanup
}

public struct BenchmarkResult: Codable, Equatable, Sendable {
    public let methodologyVersion: String
    public let maxBytes: UInt64
    public let measuredBytes: UInt64
    public let write: BenchmarkMeasurement
    public let read: BenchmarkMeasurement
    public let confidence: BenchmarkConfidence
    public let volume: BenchmarkVolume?

    public init(
        methodologyVersion: String,
        maxBytes: UInt64,
        measuredBytes: UInt64,
        write: BenchmarkMeasurement,
        read: BenchmarkMeasurement,
        confidence: BenchmarkConfidence,
        volume: BenchmarkVolume? = nil
    ) {
        self.methodologyVersion = methodologyVersion
        self.maxBytes = maxBytes
        self.measuredBytes = measuredBytes
        self.write = write
        self.read = read
        self.confidence = confidence
        self.volume = volume
    }
}

public struct BenchmarkVolume: Codable, Equatable, Sendable {
    public let id: String
    public let name: String

    public init(id: String, name: String) {
        self.id = id
        self.name = name
    }
}

public struct BenchmarkMeasurement: Codable, Equatable, Sendable {
    public let durationSeconds: Double
    public let megabytesPerSecond: Double
    public let variation: Double

    public init(durationSeconds: Double, megabytesPerSecond: Double, variation: Double) {
        self.durationSeconds = durationSeconds
        self.megabytesPerSecond = megabytesPerSecond
        self.variation = variation
    }
}

public enum BenchmarkConfidence: String, Codable, Equatable, Sendable {
    case high
    case medium
    case low
}

public enum BenchmarkProtocolError: Error {
    case invalidUTF8
}
