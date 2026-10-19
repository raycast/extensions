@preconcurrency import CoreBluetooth
import Foundation
import MotionMountKit

struct MountError: LocalizedError, CustomStringConvertible {
    let description: String
    var errorDescription: String? { description }

    static let notFound = MountError(description: "MotionMount not found. Make sure it is powered on and within Bluetooth range.")
    static let unauthorized = MountError(description: "Raycast needs Bluetooth access. Enable it in System Settings → Privacy & Security → Bluetooth.")
    static let poweredOff = MountError(description: "Bluetooth is turned off.")
    static let unsupportedHardware = MountError(description: "This Mac does not support Bluetooth LE.")
    static let bootloader = MountError(description: "The MotionMount is in bootloader mode and cannot be controlled. Power cycle it or update its firmware with the official app.")
    static let unsupportedModel = MountError(description: "This MotionMount model is not supported. Only the NEXT 7355 has been tested.")
    static let noFreeSlot = MountError(description: "All 10 preset slots are in use. Delete a preset first.")
    static let disconnected = MountError(description: "The MotionMount disconnected unexpectedly.")
}

enum Characteristic {
    static let service = CBUUID(string: "3E6FE65D-ED78-11E4-895E-00026FD5C52C")
    static let distance = uuid(0x00)
    static let rotation = uuid(0x01)
    static let calibration = uuid(0x03)
    static let target = uuid(0x21)
    static let presetPart1 = (0x0a...0x13).map(uuid)
    static let presetPart2 = (0x17...0x20).map(uuid)
    static let all = [distance, rotation, calibration, target] + presetPart1 + presetPart2

    static func uuid(_ id: Int) -> CBUUID {
        CBUUID(string: String(format: "C005FA%02X-0651-4800-B000-000000000000", id))
    }
}

final class Mount: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate, @unchecked Sendable {
    private let queue = DispatchQueue(label: "motionmount.bluetooth")
    private let rememberedID: UUID?
    private var central: CBCentralManager?
    private var peripheral: CBPeripheral?
    private var characteristics: [CBUUID: CBCharacteristic] = [:]
    private var connecting: CheckedContinuation<Void, Error>?
    private var reads: [CBUUID: CheckedContinuation<Data, Error>] = [:]
    private var writes: [CBUUID: CheckedContinuation<Void, Error>] = [:]

    var deviceID: String? { peripheral?.identifier.uuidString }

    private init(rememberedID: UUID?) {
        self.rememberedID = rememberedID
    }

    static func session<T>(deviceID: String, _ body: (Mount) async throws -> T) async throws -> T {
        let mount = Mount(rememberedID: UUID(uuidString: deviceID))
        try await mount.connect()
        defer { mount.disconnect() }
        return try await body(mount)
    }

    func read(_ uuid: CBUUID) async throws -> Data {
        try await withCheckedThrowingContinuation { continuation in
            queue.async {
                guard let peripheral = self.peripheral, let characteristic = self.characteristics[uuid] else {
                    return continuation.resume(throwing: MountError.unsupportedModel)
                }
                self.reads[uuid] = continuation
                peripheral.readValue(for: characteristic)
            }
        }
    }

    func write(_ data: Data, to uuid: CBUUID) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            queue.async {
                guard let peripheral = self.peripheral, let characteristic = self.characteristics[uuid] else {
                    return continuation.resume(throwing: MountError.unsupportedModel)
                }
                self.writes[uuid] = continuation
                peripheral.writeValue(data, for: characteristic, type: .withResponse)
            }
        }
    }

    private func connect() async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            queue.async {
                self.connecting = continuation
                self.central = CBCentralManager(delegate: self, queue: self.queue)
                self.queue.asyncAfter(deadline: .now() + 15) { self.finishConnecting(MountError.notFound) }
            }
        }
    }

    private func disconnect() {
        queue.sync {
            guard let peripheral else { return }
            self.peripheral = nil
            central?.cancelPeripheralConnection(peripheral)
        }
    }

    private func finishConnecting(_ error: Error?) {
        guard let continuation = connecting else { return }
        connecting = nil
        if let error {
            continuation.resume(throwing: error)
        } else {
            continuation.resume()
        }
    }

    private func failPending(_ error: Error) {
        finishConnecting(error)
        reads.values.forEach { $0.resume(throwing: error) }
        writes.values.forEach { $0.resume(throwing: error) }
        reads = [:]
        writes = [:]
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn: start(central)
        case .unauthorized: finishConnecting(MountError.unauthorized)
        case .poweredOff: finishConnecting(MountError.poweredOff)
        case .unsupported: finishConnecting(MountError.unsupportedHardware)
        default: break
        }
    }

    private func start(_ central: CBCentralManager) {
        central.scanForPeripherals(withServices: [Characteristic.service], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
        guard let rememberedID, let remembered = central.retrievePeripherals(withIdentifiers: [rememberedID]).first else { return }
        connect(remembered, with: central)
        queue.asyncAfter(deadline: .now() + 3) {
            guard self.connecting != nil, self.peripheral?.state != .connected else { return }
            central.cancelPeripheralConnection(remembered)
            self.peripheral = nil
        }
    }

    private func connect(_ peripheral: CBPeripheral, with central: CBCentralManager) {
        self.peripheral = peripheral
        peripheral.delegate = self
        central.connect(peripheral)
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi: NSNumber) {
        guard self.peripheral == nil else { return }
        connect(peripheral, with: central)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        central.stopScan()
        peripheral.discoverServices([Characteristic.service])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        guard peripheral == self.peripheral else { return }
        finishConnecting(error ?? MountError.disconnected)
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        guard peripheral == self.peripheral else { return }
        failPending(MountError.disconnected)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let service = peripheral.services?.first(where: { $0.uuid == Characteristic.service }) else {
            return finishConnecting(error ?? MountError.notFound)
        }
        peripheral.discoverCharacteristics(Characteristic.all, for: service)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        for characteristic in service.characteristics ?? [] {
            characteristics[characteristic.uuid] = characteristic
        }
        guard characteristics[Characteristic.distance] != nil else { return finishConnecting(MountError.bootloader) }
        guard characteristics[Characteristic.target] != nil else { return finishConnecting(MountError.unsupportedModel) }
        finishConnecting(nil)
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard let continuation = reads.removeValue(forKey: characteristic.uuid) else { return }
        if let error {
            continuation.resume(throwing: error)
        } else {
            continuation.resume(returning: characteristic.value ?? Data())
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        guard let continuation = writes.removeValue(forKey: characteristic.uuid) else { return }
        if let error {
            continuation.resume(throwing: error)
        } else {
            continuation.resume()
        }
    }
}

extension Mount {
    func readPresets() async throws -> [Preset] {
        var presets: [Preset] = []
        for index in 0..<Preset.slots {
            let part1 = try await read(Characteristic.presetPart1[index])
            let part2 = Preset.needsSecondPart(part1) ? try await read(Characteristic.presetPart2[index]) : nil
            if let preset = Preset(index: index, part1: part1, part2: part2) { presets.append(preset) }
        }
        return presets
    }

    func store(_ preset: Preset) async throws -> Preset {
        let (part1, part2) = preset.encoded
        try await write(part1, to: Characteristic.presetPart1[preset.index])
        try await write(part2, to: Characteristic.presetPart2[preset.index])
        return preset
    }
}
