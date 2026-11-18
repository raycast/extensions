import Foundation

public protocol BenchmarkCase: Sendable {
    var identifier: String { get }
    var methodologyVersion: String { get }

    func run(
        configuration: BenchmarkConfiguration,
        onProgress: @escaping (BenchmarkProgress) -> Void,
        isCancelled: @escaping () -> Bool
    ) throws -> BenchmarkResult
}

public struct SequentialBenchmarkCase: BenchmarkCase {
    public let identifier = "sequential"
    public let methodologyVersion = SequentialBenchmarkRunner.methodologyVersion

    public init() {}

    public func run(
        configuration: BenchmarkConfiguration,
        onProgress: @escaping (BenchmarkProgress) -> Void,
        isCancelled: @escaping () -> Bool
    ) throws -> BenchmarkResult {
        try SequentialBenchmarkRunner().run(
            configuration: configuration,
            onProgress: onProgress,
            isCancelled: isCancelled
        )
    }
}

public struct BenchmarkCaseRegistry: Sendable {
    public static let standard = BenchmarkCaseRegistry(cases: [SequentialBenchmarkCase()])

    private let cases: [String: any BenchmarkCase]

    public init(cases: [any BenchmarkCase]) {
        self.cases = Dictionary(uniqueKeysWithValues: cases.map { ($0.identifier, $0) })
    }

    public var supportedIdentifiers: [String] {
        cases.keys.sorted()
    }

    public func benchmarkCase(named identifier: String) -> (any BenchmarkCase)? {
        cases[identifier]
    }
}
