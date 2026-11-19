import CoreAudio
import Foundation

private final class FakeAudio: AudioBackend {
    var output: Output? = Output(id: 4, uid: "airpods")
    var ears: Placement? = Placement(left: .inEar, right: .inCase)
    var current: ListeningMode? = .transparency
    var supportsBoth = true
    var writable = true
    var acceptWrite = true
    var writes: [ListeningMode] = []
    var onSupportCheck: () -> Void = {}
    var onWrite: (ListeningMode) -> Void = { _ in }

    func defaultAirPodsOutput() -> Output? { output }
    func placement(on output: Output) -> Placement? { ears }
    func mode(on output: Output) -> ListeningMode? { current }
    func supportsToggle(on output: Output) -> Bool {
        onSupportCheck()
        return supportsBoth
    }
    func canWriteMode(on output: Output) -> Bool { writable }
    func write(_ mode: ListeningMode, on output: Output) -> Bool {
        writes.append(mode)
        onWrite(mode)
        return acceptWrite
    }
}

@main
struct ListeningModeControllerTests {
    static func main() {
        let bluetooth = kAudioDeviceTransportTypeBluetooth
        let bluetoothLE = kAudioDeviceTransportTypeBluetoothLE
        precondition(CoreAudioBackend.isSupportedAirPods(transport: bluetooth, model: "BTHeadphones76,8228"))
        precondition(CoreAudioBackend.isSupportedAirPods(transport: bluetoothLE, model: "2024 4c"))
        precondition(!CoreAudioBackend.isSupportedAirPods(transport: kAudioDeviceTransportTypeUSB, model: "2024 4c"))
        precondition(!CoreAudioBackend.isSupportedAirPods(transport: bluetoothLE, model: "2024 4d"))
        precondition(!CoreAudioBackend.isSupportedAirPods(transport: bluetoothLE, model: "2002 4c"))
        precondition(!CoreAudioBackend.isSupportedAirPods(transport: bluetoothLE, model: "AirPods Pro"))

        let audio = FakeAudio()
        let controller = ListeningModeController(audio: audio, waitForReadback: {})
        audio.onWrite = { [unowned audio] in audio.current = $0 }

        let probe = controller.probe()
        precondition(probe.eligibleOutput && probe.leftEar == "in-ear" && probe.rightEar == "in-case")
        precondition(probe.currentMode == "transparency" && probe.supportsBothModes && probe.modeWritable)
        precondition(audio.writes.isEmpty)
        precondition((try? controller.toggle()) == .noiseCancellation)
        precondition((try? controller.toggle()) == .transparency)
        precondition(audio.writes == [.noiseCancellation, .transparency])

        expect(.noAirPods) { $0.output = nil }
        expect(.wearUnknown) { $0.ears = nil }
        expect(.notWorn) { $0.ears = Placement(left: .outOfEar, right: .inCase) }
        expect(.outsideTogglePair) { $0.current = .adaptive }
        expect(.outsideTogglePair) { $0.current = .off }
        expect(.outsideTogglePair) { $0.current = nil }
        expect(.unsupported) { $0.writable = false }
        expect(.unsupported) { $0.supportsBoth = false }
        expect(.stateChanged) { audio in
            audio.onSupportCheck = { [unowned audio] in audio.output = Output(id: 4, uid: "different") }
        }
        expect(.notWorn) { audio in
            audio.onSupportCheck = { [unowned audio] in audio.ears = Placement(left: .outOfEar, right: .inCase) }
        }
        expect(.stateChanged) { audio in
            audio.onSupportCheck = { [unowned audio] in audio.current = .adaptive }
        }
        expect(.singleEarNoiseCancellationRejected, writes: [.noiseCancellation]) { $0.acceptWrite = false }
        expect(.writeFailed, writes: [.noiseCancellation]) {
            $0.ears = Placement(left: .inEar, right: .inEar)
            $0.acceptWrite = false
        }
        expect(.unconfirmed, writes: [.noiseCancellation]) { _ in }
        expect(.unconfirmed, writes: [.noiseCancellation]) { audio in
            audio.onWrite = { [unowned audio] _ in audio.output = nil }
        }

        // A single optimistic HAL match must not count as a confirmed change.
        let transient = FakeAudio()
        var reads = 0
        let transientController = ListeningModeController(audio: transient) {
            reads += 1
            transient.current = reads == 1 ? .noiseCancellation : .transparency
        }
        do {
            _ = try transientController.toggle()
            preconditionFailure("An optimistic read cannot confirm a write")
        } catch {
            precondition(error == .unconfirmed && transient.writes == [.noiseCancellation])
        }

        print("ListeningModeController tests passed")
    }

    private static func expect(_ expected: Failure, writes: [ListeningMode] = [], configure: (FakeAudio) -> Void) {
        let audio = FakeAudio()
        configure(audio)
        let controller = ListeningModeController(audio: audio, waitForReadback: {})
        do {
            _ = try controller.toggle()
            preconditionFailure("Expected \(expected.rawValue)")
        } catch {
            precondition(error == expected, "Expected \(expected.rawValue), got \(error.rawValue)")
            precondition(audio.writes == writes)
        }
    }
}
