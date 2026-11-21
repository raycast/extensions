import Foundation

enum ListeningMode: UInt32, Codable {
    case off = 1
    case noiseCancellation = 2
    case transparency = 3
    case adaptive = 4

    var label: String {
        switch self {
        case .off: "off"
        case .noiseCancellation: "noise-cancellation"
        case .transparency: "transparency"
        case .adaptive: "adaptive"
        }
    }
}

enum EarPlacement: UInt32, Codable {
    case inEar = 1
    case outOfEar = 2
    case inCase = 3

    var label: String {
        switch self {
        case .inEar: "in-ear"
        case .outOfEar: "out-of-ear"
        case .inCase: "in-case"
        }
    }
}

struct Placement {
    let left: EarPlacement
    let right: EarPlacement

    var isWorn: Bool { left == .inEar || right == .inEar }
}

struct Output: Equatable {
    let id: UInt32
    let uid: String
}

enum Failure: String, Error {
    case noAirPods = "no-airpods-output"
    case wearUnknown = "wear-unknown"
    case notWorn = "not-worn"
    case outsideTogglePair = "outside-toggle-pair"
    case unsupported
    case stateChanged = "state-changed"
    case writeFailed = "write-failed"
    case singleEarNoiseCancellationRejected = "single-ear-noise-cancellation-rejected"
    case unconfirmed
    case busy
    case lockFailed = "lock-failed"
}

protocol AudioBackend {
    func defaultAirPodsOutput() -> Output?
    func placement(on output: Output) -> Placement?
    func mode(on output: Output) -> ListeningMode?
    func supportsToggle(on output: Output) -> Bool
    func canWriteMode(on output: Output) -> Bool
    func write(_ mode: ListeningMode, on output: Output) -> Bool
}

struct Probe: Encodable {
    let eligibleOutput: Bool
    let leftEar: String
    let rightEar: String
    let currentMode: String
    let supportsBothModes: Bool
    let modeWritable: Bool

    init(eligibleOutput: Bool, placement: Placement? = nil, mode: ListeningMode? = nil,
         supportsBothModes: Bool = false, modeWritable: Bool = false) {
        self.eligibleOutput = eligibleOutput
        self.leftEar = placement?.left.label ?? "unknown"
        self.rightEar = placement?.right.label ?? "unknown"
        self.currentMode = mode?.label ?? "unknown"
        self.supportsBothModes = supportsBothModes
        self.modeWritable = modeWritable
    }
}

struct ListeningModeController {
    let audio: any AudioBackend
    var waitForReadback: () -> Void = { RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.15)) }

    func probe() -> Probe {
        guard let output = audio.defaultAirPodsOutput() else { return Probe(eligibleOutput: false) }
        let probe = Probe(eligibleOutput: true, placement: audio.placement(on: output),
                          mode: audio.mode(on: output), supportsBothModes: audio.supportsToggle(on: output),
                          modeWritable: audio.canWriteMode(on: output))
        return audio.defaultAirPodsOutput() == output ? probe : Probe(eligibleOutput: false)
    }

    func toggle() throws(Failure) -> ListeningMode {
        guard let output = audio.defaultAirPodsOutput() else { throw .noAirPods }
        _ = try wornPlacement(on: output)

        let current = audio.mode(on: output)
        let target: ListeningMode
        switch current {
        case .transparency: target = .noiseCancellation
        case .noiseCancellation: target = .transparency
        default: throw .outsideTogglePair
        }

        guard audio.supportsToggle(on: output), audio.canWriteMode(on: output) else { throw .unsupported }
        guard audio.defaultAirPodsOutput() == output else { throw .stateChanged }
        let placement = try wornPlacement(on: output)
        guard audio.mode(on: output) == current, audio.defaultAirPodsOutput() == output else { throw .stateChanged }
        guard audio.write(target, on: output) else {
            if target == .noiseCancellation && (placement.left != .inEar || placement.right != .inEar) {
                throw .singleEarNoiseCancellationRejected
            }
            throw .writeFailed
        }

        // The HAL can optimistically update its cache. Wait for two successive matches.
        var previousReadMatched = false
        for _ in 0..<24 {
            waitForReadback()
            guard audio.defaultAirPodsOutput() == output else { throw .unconfirmed }
            let matches = audio.mode(on: output) == target
            if previousReadMatched && matches {
                guard audio.defaultAirPodsOutput() == output else { throw .unconfirmed }
                return target
            }
            previousReadMatched = matches
        }
        throw .unconfirmed
    }

    private func wornPlacement(on output: Output) throws(Failure) -> Placement {
        guard let placement = audio.placement(on: output) else { throw .wearUnknown }
        guard placement.isWorn else { throw .notWorn }
        return placement
    }
}
