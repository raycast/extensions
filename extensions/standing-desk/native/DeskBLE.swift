import CoreBluetooth
import Darwin
import Foundation

private let controlServiceUUID = CBUUID(string: "99FA0001-338A-1024-8A49-009C0215F78A")
private let controlCharacteristicUUID = CBUUID(string: "99FA0002-338A-1024-8A49-009C0215F78A")
private let outputServiceUUID = CBUUID(string: "99FA0020-338A-1024-8A49-009C0215F78A")
private let outputCharacteristicUUID = CBUUID(string: "99FA0021-338A-1024-8A49-009C0215F78A")
private let inputServiceUUID = CBUUID(string: "99FA0030-338A-1024-8A49-009C0215F78A")
private let inputCharacteristicUUID = CBUUID(string: "99FA0031-338A-1024-8A49-009C0215F78A")
private let movementHandoffTimeout = 5.0

private enum DeskOperation {
    case discover
    case status
    case move(Double)
    case nudge(Double)
    case stop
    case selfTest
}

private enum ControlWritePurpose {
    case movementSetup
    case finalStop(String)
}

private struct Options {
    let operation: DeskOperation
    var deskName = "Desk"
    var identifier: UUID?
    var baseHeight = 62.0
    var minimumHeight = 62.0
    var maximumHeight = 127.0
    var cancelFile: String?
    var lockFile: String?
    var movementRequestID: String?
    var connectionTimeout = 12.0
    var discoveryTimeout = 5.0
    var movementTimeout = 45.0
}

private enum ArgumentError: LocalizedError {
    case message(String)

    var errorDescription: String? {
        switch self {
        case let .message(message): message
        }
    }
}

private struct Reading {
    let heightCm: Double
    let speed: Double
}

private struct DiscoveredPeripheralState {
    let connected: Bool
    let nameQuality: Int
}

private func rawTarget(for heightCm: Double, baseHeight: Double) -> UInt16? {
    let raw = ((heightCm - baseHeight) * 100).rounded()
    guard raw >= 0, raw <= Double(UInt16.max) else { return nil }
    return UInt16(raw)
}

private func decodeReading(_ data: Data, baseHeight: Double) -> Reading? {
    guard data.count >= 4 else { return nil }
    let rawHeight = UInt16(data[0]) | UInt16(data[1]) << 8
    let rawSpeedBits = UInt16(data[2]) | UInt16(data[3]) << 8
    let rawSpeed = Int16(bitPattern: rawSpeedBits)
    return Reading(
        heightCm: baseHeight + Double(rawHeight) / 100,
        speed: Double(rawSpeed) / 100
    )
}

private func littleEndianData(_ value: UInt16) -> Data {
    Data([UInt8(value & 0x00ff), UInt8((value & 0xff00) >> 8)])
}

private func isDiscoveryCandidate(
    peripheralName: String?,
    advertisedName: String?,
    advertisedServices: [CBUUID],
    nameFilter: String
) -> Bool {
    if [peripheralName, advertisedName]
        .compactMap({ $0 })
        .contains(where: { $0.localizedCaseInsensitiveContains(nameFilter) })
    {
        return true
    }
    return advertisedServices.contains(controlServiceUUID)
}

private func nudgedTarget(
    currentHeight: Double,
    delta: Double,
    minimumHeight: Double,
    maximumHeight: Double
) -> Double? {
    let proposed = currentHeight + delta
    let clamped = min(max(proposed, minimumHeight), maximumHeight)
    if delta > 0, clamped < currentHeight { return nil }
    if delta < 0, clamped > currentHeight { return nil }
    return clamped
}

private func parseOptions(_ arguments: [String]) throws -> Options {
    guard let command = arguments.first else {
        throw ArgumentError.message("Expected one of: discover, status, move, nudge, stop, self-test.")
    }

    var index = 1
    let operation: DeskOperation
    switch command {
    case "discover":
        operation = .discover
    case "status":
        operation = .status
    case "move":
        guard arguments.count > 1, let target = Double(arguments[1]) else {
            throw ArgumentError.message("move requires a target height in centimeters.")
        }
        operation = .move(target)
        index = 2
    case "nudge":
        guard arguments.count > 1, let delta = Double(arguments[1]), delta != 0 else {
            throw ArgumentError.message("nudge requires a non-zero distance in centimeters.")
        }
        operation = .nudge(delta)
        index = 2
    case "stop":
        operation = .stop
    case "self-test":
        return Options(operation: .selfTest)
    default:
        throw ArgumentError.message("Unknown command: \(command).")
    }

    var options = Options(operation: operation)
    while index < arguments.count {
        let option = arguments[index]
        guard index + 1 < arguments.count else {
            throw ArgumentError.message("Missing value for \(option).")
        }
        let value = arguments[index + 1]
        switch option {
        case "--name":
            options.deskName = value
        case "--identifier":
            guard let identifier = UUID(uuidString: value) else {
                throw ArgumentError.message("Invalid desk identifier: \(value).")
            }
            options.identifier = identifier
        case "--base-height":
            guard let height = Double(value) else { throw ArgumentError.message("Invalid base height.") }
            options.baseHeight = height
        case "--minimum-height":
            guard let height = Double(value) else { throw ArgumentError.message("Invalid minimum height.") }
            options.minimumHeight = height
        case "--maximum-height":
            guard let height = Double(value) else { throw ArgumentError.message("Invalid maximum height.") }
            options.maximumHeight = height
        case "--cancel-file":
            options.cancelFile = value
        case "--lock-file":
            options.lockFile = value
        case "--movement-request-id":
            guard UUID(uuidString: value) != nil else {
                throw ArgumentError.message("Invalid movement request identifier.")
            }
            options.movementRequestID = value.lowercased()
        case "--connection-timeout":
            guard let timeout = Double(value), timeout > 0 else {
                throw ArgumentError.message("Invalid connection timeout.")
            }
            options.connectionTimeout = timeout
        case "--discovery-timeout":
            guard let timeout = Double(value), timeout > 0 else {
                throw ArgumentError.message("Invalid discovery timeout.")
            }
            options.discoveryTimeout = timeout
        case "--movement-timeout":
            guard let timeout = Double(value), timeout > 0 else {
                throw ArgumentError.message("Invalid movement timeout.")
            }
            options.movementTimeout = timeout
        default:
            throw ArgumentError.message("Unknown option: \(option).")
        }
        index += 2
    }

    guard options.minimumHeight < options.maximumHeight else {
        throw ArgumentError.message("Minimum height must be lower than maximum height.")
    }
    switch options.operation {
    case .move, .nudge:
        guard options.identifier != nil,
              options.cancelFile?.isEmpty == false,
              options.lockFile?.isEmpty == false,
              options.movementRequestID != nil
        else {
            throw ArgumentError.message(
                "Movement requires a selected desk, cancellation file, movement lock, and request identifier."
            )
        }
    case .status:
        guard options.identifier != nil else {
            throw ArgumentError.message("Status requires a selected desk.")
        }
    case .stop:
        guard options.identifier != nil,
              options.cancelFile?.isEmpty == false,
              options.movementRequestID != nil
        else {
            throw ArgumentError.message(
                "Stop requires a selected desk, cancellation file, and request identifier."
            )
        }
    case .discover, .selfTest:
        break
    }
    return options
}

private enum MovementLockError: LocalizedError {
    case superseded
    case timedOut

    var errorDescription: String? {
        switch self {
        case .superseded:
            "This movement was replaced by a newer command."
        case .timedOut:
            "The active desk movement did not stop within \(Int(movementHandoffTimeout)) seconds."
        }
    }
}

private func movementRequestIsCurrent(at path: String, requestID: String) -> Bool {
    guard let contents = try? String(contentsOfFile: path, encoding: .utf8) else { return false }
    return contents.trimmingCharacters(in: .whitespacesAndNewlines) == requestID
}

private final class MovementLock {
    private var descriptor: Int32 = -1

    init(path: String, waitTimeout: TimeInterval, requestIsCurrent: () -> Bool) throws {
        descriptor = open(path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard descriptor >= 0 else {
            throw ArgumentError.message("Could not create the movement lock.")
        }

        let deadline = Date().addingTimeInterval(waitTimeout)
        while flock(descriptor, LOCK_EX | LOCK_NB) != 0 {
            let lockError = errno
            guard lockError == EWOULDBLOCK || lockError == EAGAIN else {
                closeDescriptor()
                throw ArgumentError.message("Could not obtain the movement lock.")
            }
            guard requestIsCurrent() else {
                closeDescriptor()
                throw MovementLockError.superseded
            }
            guard waitTimeout > 0, Date() < deadline else {
                closeDescriptor()
                if waitTimeout > 0 {
                    throw MovementLockError.timedOut
                }
                throw ArgumentError.message("Another desk movement is active. Stop it before starting a new movement.")
            }
            usleep(50_000)
        }

        guard requestIsCurrent() else {
            flock(descriptor, LOCK_UN)
            closeDescriptor()
            throw MovementLockError.superseded
        }
    }

    deinit {
        if descriptor >= 0 {
            flock(descriptor, LOCK_UN)
            closeDescriptor()
        }
    }

    private func closeDescriptor() {
        if descriptor >= 0 {
            close(descriptor)
            descriptor = -1
        }
    }
}

private final class DeskClient: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    private let options: Options
    private var central: CBCentralManager!
    private var peripheral: CBPeripheral?
    private var controlCharacteristic: CBCharacteristic?
    private var outputCharacteristic: CBCharacteristic?
    private var inputCharacteristic: CBCharacteristic?
    private var connectionTimeoutWorkItem: DispatchWorkItem?
    private var movementTimer: Timer?
    private var cancellationTimer: Timer?
    private var targetHeight: Double?
    private var targetRaw: UInt16?
    private var lastReading: Reading?
    private var stableTargetReadings = 0
    private var stationaryReadings = 0
    private var movementStartedAt: Date?
    private var pendingControlWrites: [ControlWritePurpose] = []
    private var finalStopPending = false
    private var stopCompletionWorkItem: DispatchWorkItem?
    private var operationStarted = false
    private var finishing = false
    private var discoveredIdentifiers: [UUID: DiscoveredPeripheralState] = [:]
    private var movementLock: MovementLock?
    private var signalSources: [DispatchSourceSignal] = []

    init(options: Options) throws {
        self.options = options
        super.init()

        switch options.operation {
        case .move, .nudge:
            if let lockFile = options.lockFile {
                let requestIsCurrent = {
                    guard let cancelFile = options.cancelFile,
                          let requestID = options.movementRequestID
                    else { return true }
                    return movementRequestIsCurrent(at: cancelFile, requestID: requestID)
                }
                movementLock = try MovementLock(
                    path: lockFile,
                    waitTimeout: options.movementRequestID == nil ? 0 : movementHandoffTimeout,
                    requestIsCurrent: requestIsCurrent
                )
            }
        case .stop:
            if let cancelFile = options.cancelFile,
               let requestID = options.movementRequestID,
               !movementRequestIsCurrent(at: cancelFile, requestID: requestID)
            {
                throw MovementLockError.superseded
            }
        default:
            break
        }
    }

    func start() {
        installSignalHandlers()
        if !options.operation.isDiscovery {
            let workItem = DispatchWorkItem { [weak self] in
                self?.fail("Timed out while connecting to the desk. Put it in pairing mode and quit other desk-control apps.")
            }
            connectionTimeoutWorkItem = workItem
            DispatchQueue.main.asyncAfter(deadline: .now() + options.connectionTimeout, execute: workItem)
        }
        central = CBCentralManager(delegate: self, queue: .main)
        if shouldMonitorMovementRequest {
            cancellationTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
                self?.cancelIfReplaced()
            }
        }
        RunLoop.main.run()
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            if options.operation.isDiscovery {
                startDiscovery()
            } else {
                findDesk()
            }
        case .unauthorized:
            fail("Bluetooth access is denied. Allow Standing Desk Bluetooth Helper in System Settings > Privacy & Security > Bluetooth.")
        case .poweredOff:
            fail("Bluetooth is turned off.")
        case .unsupported:
            fail("This Mac does not support Bluetooth Low Energy.")
        case .resetting, .unknown:
            break
        @unknown default:
            fail("Bluetooth entered an unsupported state.")
        }
    }

    private func startDiscovery() {
        guard !operationStarted else { return }
        operationStarted = true
        let workItem = DispatchWorkItem { [weak self] in self?.completeDiscovery() }
        connectionTimeoutWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + options.discoveryTimeout, execute: workItem)
        findDesks()
    }

    private func findDesks() {
        if let identifier = options.identifier,
           let rememberedDesk = central.retrievePeripherals(withIdentifiers: [identifier]).first
        {
            emitDiscoveredDesk(rememberedDesk, connected: rememberedDesk.state == .connected)
        }

        for connectedDesk in central.retrieveConnectedPeripherals(withServices: [controlServiceUUID]) {
            emitDiscoveredDesk(connectedDesk, connected: true)
        }

        central.scanForPeripherals(
            withServices: nil,
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]
        )
    }

    private func findDesk() {
        if let identifier = options.identifier {
            if let knownDesk = central.retrievePeripherals(withIdentifiers: [identifier]).first {
                connect(knownDesk)
                return
            }
        }

        let connected = central.retrieveConnectedPeripherals(withServices: [controlServiceUUID])
        if let connectedDesk = connected.first(where: matchesDesk) {
            connect(connectedDesk)
            return
        }

        central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
    }

    private func matchesDesk(_ candidate: CBPeripheral) -> Bool {
        if let identifier = options.identifier {
            return candidate.identifier == identifier
        }
        guard let name = candidate.name else { return false }
        return name.localizedCaseInsensitiveContains(options.deskName)
    }

    func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        if options.operation.isDiscovery {
            guard matchesDiscoveryCandidate(peripheral, advertisementData: advertisementData) else { return }
            let advertisedName = advertisementData[CBAdvertisementDataLocalNameKey] as? String
            emitDiscoveredDesk(
                peripheral,
                connected: peripheral.state == .connected,
                advertisedName: advertisedName
            )
            return
        }
        guard self.peripheral == nil, matchesDesk(peripheral) else { return }
        connect(peripheral)
    }

    private func matchesDiscoveryCandidate(
        _ candidate: CBPeripheral,
        advertisementData: [String: Any]
    ) -> Bool {
        let advertisedName = advertisementData[CBAdvertisementDataLocalNameKey] as? String
        let advertisedServices = advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID] ?? []
        return isDiscoveryCandidate(
            peripheralName: candidate.name,
            advertisedName: advertisedName,
            advertisedServices: advertisedServices,
            nameFilter: options.deskName
        )
    }

    private func emitDiscoveredDesk(
        _ desk: CBPeripheral,
        connected: Bool,
        advertisedName: String? = nil
    ) {
        let reportedName = advertisedName ?? desk.name
        let nameQuality = advertisedName != nil ? 2 : desk.name != nil ? 1 : 0
        let incoming = DiscoveredPeripheralState(
            connected: connected,
            nameQuality: nameQuality
        )
        if let previous = discoveredIdentifiers[desk.identifier] {
            let improvesConnection = connected && !previous.connected
            let improvesName = incoming.nameQuality > previous.nameQuality
            guard improvesConnection || improvesName else { return }
            discoveredIdentifiers[desk.identifier] = DiscoveredPeripheralState(
                connected: previous.connected || connected,
                nameQuality: max(previous.nameQuality, incoming.nameQuality)
            )
        } else {
            discoveredIdentifiers[desk.identifier] = incoming
        }
        emit([
            "event": "device",
            "connected": discoveredIdentifiers[desk.identifier]?.connected == true,
            "deskName": reportedName ?? options.deskName,
            "identifier": desk.identifier.uuidString,
            "nameQuality": nameQuality,
        ])
    }

    private func completeDiscovery() {
        guard !finishing else { return }
        finishing = true
        central.stopScan()
        emit([
            "event": "complete",
            "message": "Found \(discoveredIdentifiers.count) nearby desk\(discoveredIdentifiers.count == 1 ? "" : "s").",
        ])
        shutdown(code: 0)
    }

    private func connect(_ desk: CBPeripheral) {
        guard peripheral == nil else { return }
        peripheral = desk
        central.stopScan()
        central.connect(desk, options: nil)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        peripheral.delegate = self
        peripheral.discoverServices([controlServiceUUID, outputServiceUUID, inputServiceUUID])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        fail("Could not connect to \(peripheral.name ?? "the desk"): \(error?.localizedDescription ?? "unknown error").")
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        guard !finishing else { return }
        fail("The desk disconnected\(error.map { ": \($0.localizedDescription)" } ?? ".")")
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error {
            fail("Could not discover desk services: \(error.localizedDescription).")
            return
        }
        guard let services = peripheral.services else {
            fail("The desk did not expose its Bluetooth services.")
            return
        }
        for service in services {
            switch service.uuid {
            case controlServiceUUID:
                peripheral.discoverCharacteristics([controlCharacteristicUUID], for: service)
            case outputServiceUUID:
                peripheral.discoverCharacteristics([outputCharacteristicUUID], for: service)
            case inputServiceUUID:
                peripheral.discoverCharacteristics([inputCharacteristicUUID], for: service)
            default:
                break
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error {
            fail("Could not discover desk controls: \(error.localizedDescription).")
            return
        }
        for characteristic in service.characteristics ?? [] {
            switch characteristic.uuid {
            case controlCharacteristicUUID:
                controlCharacteristic = characteristic
            case outputCharacteristicUUID:
                outputCharacteristic = characteristic
            case inputCharacteristicUUID:
                inputCharacteristic = characteristic
            default:
                break
            }
        }
        startOperationWhenReady()
    }

    private func startOperationWhenReady() {
        guard !operationStarted, let peripheral else { return }
        switch options.operation {
        case .discover:
            return
        case .status:
            guard let outputCharacteristic else { return }
            operationStarted = true
            connectionTimeoutWorkItem?.cancel()
            peripheral.readValue(for: outputCharacteristic)
        case .stop:
            guard controlCharacteristic != nil else { return }
            if movementWasReplaced() {
                complete(outcome: "stopped", reading: lastReading)
                return
            }
            operationStarted = true
            connectionTimeoutWorkItem?.cancel()
            stopAndComplete(outcome: "stopped")
        case .move, .nudge:
            guard controlCharacteristic != nil, inputCharacteristic != nil, let outputCharacteristic else { return }
            operationStarted = true
            connectionTimeoutWorkItem?.cancel()
            peripheral.setNotifyValue(true, for: outputCharacteristic)
            peripheral.readValue(for: outputCharacteristic)
        case .selfTest:
            break
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error {
            fail("Could not read desk height: \(error.localizedDescription).")
            return
        }
        guard characteristic == outputCharacteristic,
              let data = characteristic.value,
              let reading = decodeReading(data, baseHeight: options.baseHeight)
        else { return }

        let previousReading = lastReading
        lastReading = reading
        emit([
            "event": targetHeight == nil ? "status" : "progress",
            "connected": true,
            "deskName": peripheral.name ?? "Desk",
            "identifier": peripheral.identifier.uuidString,
            "heightCm": rounded(reading.heightCm),
            "speed": rounded(reading.speed),
        ])

        switch options.operation {
        case .status:
            complete(outcome: nil, reading: reading)
        case let .move(height):
            if targetHeight == nil {
                beginMovement(to: height, from: reading)
            } else {
                evaluateMovement(reading, previous: previousReading)
            }
        case let .nudge(delta):
            if targetHeight == nil {
                guard let target = nudgedTarget(
                    currentHeight: reading.heightCm,
                    delta: delta,
                    minimumHeight: options.minimumHeight,
                    maximumHeight: options.maximumHeight
                ) else {
                    fail("The requested adjustment would move the desk in the opposite direction. Check the configured limits.")
                    return
                }
                beginMovement(to: target, from: reading)
            } else {
                evaluateMovement(reading, previous: previousReading)
            }
        case .discover, .stop, .selfTest:
            break
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        if characteristic == controlCharacteristic, !pendingControlWrites.isEmpty {
            let purpose = pendingControlWrites.removeFirst()
            guard !finishing else { return }
            switch purpose {
            case .movementSetup:
                if let error {
                    fail("The desk rejected a movement command: \(error.localizedDescription).")
                }
            case let .finalStop(outcome):
                finalStopPending = false
                stopCompletionWorkItem?.cancel()
                stopCompletionWorkItem = nil
                if let error {
                    fail("The desk rejected the stop command: \(error.localizedDescription).")
                } else {
                    complete(outcome: outcome, reading: lastReading)
                }
            }
            return
        }
        if let error, !finishing {
            fail("The desk rejected a movement command: \(error.localizedDescription).")
        }
    }

    private func beginMovement(to requestedHeight: Double, from reading: Reading) {
        if movementWasReplaced() {
            stopAndComplete(outcome: "stopped")
            return
        }
        guard requestedHeight >= options.minimumHeight, requestedHeight <= options.maximumHeight else {
            fail("Target height must be between \(options.minimumHeight) and \(options.maximumHeight) cm.")
            return
        }
        guard let targetRaw = rawTarget(for: requestedHeight, baseHeight: options.baseHeight) else {
            fail("Target height cannot be represented by this desk controller.")
            return
        }
        targetHeight = requestedHeight
        self.targetRaw = targetRaw
        movementStartedAt = Date()

        if abs(reading.heightCm - requestedHeight) <= 0.25 {
            stopAndComplete(outcome: "reached")
            return
        }

        guard let peripheral, let controlCharacteristic else {
            fail("Desk movement controls are unavailable.")
            return
        }
        writeControl(Data([0xfe, 0x00]), purpose: .movementSetup, peripheral: peripheral, characteristic: controlCharacteristic)
        writeControl(Data([0xff, 0x00]), purpose: .movementSetup, peripheral: peripheral, characteristic: controlCharacteristic)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.sendTarget()
            self?.movementTimer = Timer.scheduledTimer(withTimeInterval: 0.4, repeats: true) { [weak self] _ in
                self?.sendTarget()
            }
        }
    }

    private func sendTarget() {
        guard !finishing else { return }
        if movementWasReplaced() {
            stopAndComplete(outcome: "stopped")
            return
        }
        if let startedAt = movementStartedAt, Date().timeIntervalSince(startedAt) > options.movementTimeout {
            fail("Desk movement exceeded \(Int(options.movementTimeout)) seconds and was stopped.")
            return
        }
        guard let peripheral, let inputCharacteristic, let outputCharacteristic, let targetRaw else {
            fail("Desk movement controls became unavailable.")
            return
        }
        peripheral.writeValue(littleEndianData(targetRaw), for: inputCharacteristic, type: writeType(for: inputCharacteristic))
        peripheral.readValue(for: outputCharacteristic)
    }

    private func evaluateMovement(_ reading: Reading, previous: Reading?) {
        guard let targetHeight else { return }
        if abs(reading.heightCm - targetHeight) <= 0.25 {
            stableTargetReadings += 1
        } else {
            stableTargetReadings = 0
        }
        if stableTargetReadings >= 2 {
            stopAndComplete(outcome: "reached")
            return
        }

        if let previous,
           abs(previous.heightCm - reading.heightCm) < 0.01,
           abs(reading.speed) < 0.01,
           movementStartedAt.map({ Date().timeIntervalSince($0) > 2 }) == true
        {
            stationaryReadings += 1
        } else {
            stationaryReadings = 0
        }
        if stationaryReadings >= 5 {
            fail("The desk stopped before reaching \(rounded(targetHeight)) cm. Check for an obstruction.")
        }
    }

    private func writeType(for characteristic: CBCharacteristic) -> CBCharacteristicWriteType {
        characteristic.properties.contains(.write) ? .withResponse : .withoutResponse
    }

    private func writeControl(
        _ data: Data,
        purpose: ControlWritePurpose,
        peripheral: CBPeripheral,
        characteristic: CBCharacteristic
    ) {
        let type = writeType(for: characteristic)
        if type == .withResponse {
            pendingControlWrites.append(purpose)
        }
        peripheral.writeValue(data, for: characteristic, type: type)
    }

    private func stopAndComplete(outcome: String) {
        guard !finishing, !finalStopPending else { return }
        movementTimer?.invalidate()
        movementTimer = nil
        cancellationTimer?.invalidate()
        cancellationTimer = nil
        guard let peripheral, let controlCharacteristic else {
            complete(outcome: outcome, reading: lastReading)
            return
        }
        let type = writeType(for: controlCharacteristic)
        if type == .withResponse {
            finalStopPending = true
            let workItem = DispatchWorkItem { [weak self] in
                guard let self, self.finalStopPending else { return }
                self.finalStopPending = false
                self.fail("The desk did not acknowledge the stop command.")
            }
            stopCompletionWorkItem = workItem
            writeControl(Data([0xff, 0x00]), purpose: .finalStop(outcome), peripheral: peripheral, characteristic: controlCharacteristic)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1, execute: workItem)
        } else {
            finishing = true
            peripheral.writeValue(Data([0xff, 0x00]), for: controlCharacteristic, type: type)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                self?.complete(outcome: outcome, reading: self?.lastReading, alreadyFinishing: true)
            }
        }
    }

    private func complete(outcome: String?, reading: Reading?, alreadyFinishing: Bool = false) {
        guard !finishing || alreadyFinishing else { return }
        finishing = true
        movementTimer?.invalidate()
        cancellationTimer?.invalidate()
        stopCompletionWorkItem?.cancel()
        finalStopPending = false
        var payload: [String: Any] = [
            "event": "complete",
            "connected": peripheral?.state == .connected,
        ]
        if let outcome { payload["outcome"] = outcome }
        if let reading {
            payload["heightCm"] = rounded(reading.heightCm)
            payload["speed"] = rounded(reading.speed)
        }
        if let peripheral {
            payload["deskName"] = peripheral.name ?? "Desk"
            payload["identifier"] = peripheral.identifier.uuidString
        }
        emit(payload)
        shutdown(code: 0)
    }

    private func fail(_ message: String) {
        guard !finishing else { return }
        finishing = true
        movementTimer?.invalidate()
        cancellationTimer?.invalidate()
        stopCompletionWorkItem?.cancel()
        finalStopPending = false
        if let peripheral, let controlCharacteristic, options.operation.isMovement {
            peripheral.writeValue(Data([0xff, 0x00]), for: controlCharacteristic, type: writeType(for: controlCharacteristic))
        }
        emit(["event": "error", "message": message])
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.shutdown(code: 1)
        }
    }

    private func shutdown(code: Int32) {
        connectionTimeoutWorkItem?.cancel()
        if let peripheral, peripheral.state != .disconnected {
            central.cancelPeripheralConnection(peripheral)
        }
        fflush(stdout)
        fflush(stderr)
        Darwin.exit(code)
    }

    private func installSignalHandlers() {
        for signalNumber in [SIGINT, SIGTERM] {
            signal(signalNumber, SIG_IGN)
            let source = DispatchSource.makeSignalSource(signal: signalNumber, queue: .main)
            source.setEventHandler { [weak self] in
                guard let self else { return }
                switch self.options.operation {
                case .discover:
                    self.completeDiscovery()
                case .status:
                    self.complete(outcome: nil, reading: self.lastReading)
                case .move, .nudge, .stop:
                    self.stopAndComplete(outcome: "stopped")
                case .selfTest:
                    break
                }
            }
            source.resume()
            signalSources.append(source)
        }
    }

    private func movementWasReplaced() -> Bool {
        guard let cancelFile = options.cancelFile else { return false }
        if let requestID = options.movementRequestID {
            return !movementRequestIsCurrent(at: cancelFile, requestID: requestID)
        }
        switch options.operation {
        case .move, .nudge:
            return FileManager.default.fileExists(atPath: cancelFile)
        default:
            return false
        }
    }

    private var shouldMonitorMovementRequest: Bool {
        guard options.cancelFile != nil else { return false }
        switch options.operation {
        case .move, .nudge:
            return true
        case .stop:
            return options.movementRequestID != nil
        default:
            return false
        }
    }

    private func cancelIfReplaced() {
        guard !finishing, movementWasReplaced() else { return }
        if options.operation.isMovement {
            stopAndComplete(outcome: "stopped")
        } else {
            complete(outcome: "stopped", reading: lastReading)
        }
    }

    private func rounded(_ value: Double) -> NSDecimalNumber {
        NSDecimalNumber(
            string: String(format: "%.2f", value),
            locale: Locale(identifier: "en_US_POSIX")
        )
    }
}

private extension DeskOperation {
    var isDiscovery: Bool {
        if case .discover = self { return true }
        return false
    }

    var isMovement: Bool {
        switch self {
        case .move, .nudge:
            true
        default:
            false
        }
    }
}

private func emit(_ payload: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(payload),
          let data = try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]),
          let line = String(data: data, encoding: .utf8)
    else { return }
    print(line)
    fflush(stdout)
}

private func runSelfTests() -> Bool {
    guard rawTarget(for: 70, baseHeight: 62) == 800 else { return false }
    guard rawTarget(for: 110, baseHeight: 62) == 4_800 else { return false }
    guard rawTarget(for: 61, baseHeight: 62) == nil else { return false }

    let data = Data([0x20, 0x03, 0x9c, 0xff])
    guard let reading = decodeReading(data, baseHeight: 62) else { return false }
    guard abs(reading.heightCm - 70) < 0.001 else { return false }
    guard abs(reading.speed - (-1)) < 0.001 else { return false }
    guard littleEndianData(4_800) == Data([0xc0, 0x12]) else { return false }
    guard (try? parseOptions(["discover", "--discovery-timeout", "1"]))?.operation.isDiscovery == true else {
        return false
    }
    guard (try? parseOptions(["discover", "--discovery-timeout", "0"])) == nil else { return false }
    guard isDiscoveryCandidate(
        peripheralName: nil,
        advertisedName: "Desk 1234",
        advertisedServices: [],
        nameFilter: "desk"
    ) else { return false }
    guard isDiscoveryCandidate(
        peripheralName: "Office",
        advertisedName: nil,
        advertisedServices: [controlServiceUUID],
        nameFilter: "desk"
    ) else { return false }
    guard !isDiscoveryCandidate(
        peripheralName: "Headphones",
        advertisedName: nil,
        advertisedServices: [],
        nameFilter: "desk"
    ) else { return false }
    guard nudgedTarget(currentHeight: 128, delta: 1, minimumHeight: 62, maximumHeight: 127) == nil else {
        return false
    }
    guard nudgedTarget(currentHeight: 128, delta: -1, minimumHeight: 62, maximumHeight: 127) == 127 else {
        return false
    }
    guard nudgedTarget(currentHeight: 61, delta: -1, minimumHeight: 62, maximumHeight: 127) == nil else {
        return false
    }

    guard (try? parseOptions(["move", "70"])) == nil else { return false }
    guard (try? parseOptions(["nudge", "1"])) == nil else { return false }
    guard (try? parseOptions(["status"])) == nil else { return false }
    guard (try? parseOptions(["stop"])) == nil else { return false }
    let safetyArguments = [
        "--identifier", "11111111-1111-1111-1111-111111111111",
        "--cancel-file", "/tmp/standing-desk-self-test-request",
        "--lock-file", "/tmp/standing-desk-self-test-lock",
        "--movement-request-id", "22222222-2222-2222-2222-222222222222",
    ]
    guard (try? parseOptions(["move", "70"] + safetyArguments))?.operation.isMovement == true else {
        return false
    }
    guard (try? parseOptions(["nudge", "1"] + safetyArguments))?.operation.isMovement == true else {
        return false
    }
    guard (try? parseOptions(["stop"] + safetyArguments)) != nil else { return false }
    guard (try? parseOptions([
        "status", "--identifier", "11111111-1111-1111-1111-111111111111",
    ])) != nil else { return false }

    let testDirectory = FileManager.default.temporaryDirectory
        .appendingPathComponent("standing-desk-self-test-\(UUID().uuidString)")
    do {
        try FileManager.default.createDirectory(at: testDirectory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: testDirectory) }

        let requestFile = testDirectory.appendingPathComponent("movement-request")
        try "current-request\n".write(to: requestFile, atomically: true, encoding: .utf8)
        guard movementRequestIsCurrent(at: requestFile.path, requestID: "current-request") else { return false }
        guard !movementRequestIsCurrent(at: requestFile.path, requestID: "older-request") else { return false }

        let lockFile = testDirectory.appendingPathComponent("movement.lock")
        var firstLock: MovementLock? = try MovementLock(
            path: lockFile.path,
            waitTimeout: 0,
            requestIsCurrent: { true }
        )
        do {
            _ = try MovementLock(
                path: lockFile.path,
                waitTimeout: 0.05,
                requestIsCurrent: { true }
            )
            return false
        } catch MovementLockError.timedOut {
            // Expected while the first lock is held.
        }
        do {
            _ = try MovementLock(
                path: lockFile.path,
                waitTimeout: 0.05,
                requestIsCurrent: { false }
            )
            return false
        } catch MovementLockError.superseded {
            // Expected when a newer request exists.
        }
        withExtendedLifetime(firstLock) {}
        firstLock = nil
        _ = try MovementLock(
            path: lockFile.path,
            waitTimeout: 0,
            requestIsCurrent: { true }
        )
    } catch {
        return false
    }
    return true
}

do {
    let options = try parseOptions(Array(CommandLine.arguments.dropFirst()))
    switch options.operation {
    case .selfTest:
        if runSelfTests() {
            emit(["event": "complete", "message": "Native protocol self-tests passed."])
            Darwin.exit(0)
        } else {
            emit(["event": "error", "message": "Native protocol self-tests failed."])
            Darwin.exit(1)
        }
    default:
        let client = try DeskClient(options: options)
        client.start()
    }
} catch MovementLockError.superseded {
    emit(["event": "complete", "connected": false, "outcome": "stopped"])
    Darwin.exit(0)
} catch {
    emit(["event": "error", "message": error.localizedDescription])
    Darwin.exit(1)
}
