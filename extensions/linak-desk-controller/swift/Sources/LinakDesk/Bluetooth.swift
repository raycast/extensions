import CoreBluetooth
import Foundation

let controlServiceUUID = CBUUID(string: "99FA0001-338A-1024-8A49-009C0215F78A")
let controlCharacteristicUUID = CBUUID(string: "99FA0002-338A-1024-8A49-009C0215F78A")
let outputServiceUUID = CBUUID(string: "99FA0020-338A-1024-8A49-009C0215F78A")
let outputCharacteristicUUID = CBUUID(string: "99FA0021-338A-1024-8A49-009C0215F78A")
let inputServiceUUID = CBUUID(string: "99FA0030-338A-1024-8A49-009C0215F78A")
let inputCharacteristicUUID = CBUUID(string: "99FA0031-338A-1024-8A49-009C0215F78A")

/// Set LINAK_DEBUG=1 to trace Bluetooth activity on stderr when running the compiled binary by hand.
func debug(_ message: @autoclosure () -> String) {
  guard ProcessInfo.processInfo.environment["LINAK_DEBUG"] != nil else { return }
  FileHandle.standardError.write(Data("[\(Date().timeIntervalSince1970)] \(message())\n".utf8))
}

enum DeskError: LocalizedError, CustomStringConvertible {
  case bluetoothOff
  case bluetoothUnauthorized
  case bluetoothUnavailable
  case invalidDeskId(String)
  case noDeskFound
  case multipleDesksFound
  case deskNotFound
  case connectionTimedOut
  case connectionFailed(String?)
  case notALinakDesk
  case pairingRequired
  case communicationFailed(String)
  case invalidTarget(Double)
  case movementTimedOut
  case requestUnavailable(String)
  case obstructed(heightCm: Double, targetCm: Double)

  var isNotALinakDesk: Bool {
    if case .notALinakDesk = self { return true }
    return false
  }

  // The Raycast bridge reports errors with `String(describing:)`.
  var description: String { errorDescription ?? "Unknown error" }

  var errorDescription: String? {
    switch self {
    case .bluetoothOff:
      "Bluetooth is turned off. Turn it on in System Settings and try again."
    case .bluetoothUnauthorized:
      "Raycast doesn't have access to Bluetooth. Allow it in System Settings → Privacy & Security → Bluetooth."
    case .bluetoothUnavailable:
      "Bluetooth isn't available on this Mac."
    case let .invalidDeskId(id):
      "\"\(id)\" isn't a valid desk identifier. Clear the preference to discover your desk automatically."
    case .noDeskFound:
      "No desk found nearby. Hold the Bluetooth button on the desk controller until the light blinks, then try again."
    case .multipleDesksFound:
      "More than one desk found nearby. Run Select Desk to choose which one to control."
    case .deskNotFound:
      "Couldn't find your desk. Make sure it's powered on and nearby, or run Select Desk to pick it again."
    case .connectionTimedOut:
      "The desk didn't accept the connection. If it hasn't been used with this Mac before, hold the Bluetooth button on the desk controller until the light blinks, then try again."
    case let .connectionFailed(reason):
      "Couldn't connect to the desk\(reason.map { ": \($0)" } ?? ""). Make sure it isn't connected to another device."
    case .notALinakDesk:
      "The selected device isn't a supported Linak desk."
    case .pairingRequired:
      "The desk needs to be paired. Hold the Bluetooth button on the desk controller until the light blinks, then try again."
    case let .communicationFailed(reason):
      "Lost communication with the desk: \(reason)"
    case let .invalidTarget(height):
      "\(format(height)) cm is outside the range this desk can reach."
    case .movementTimedOut:
      "The desk took too long to move and was stopped."
    case let .requestUnavailable(reason):
      "Couldn't coordinate with other desk commands: \(reason)"
    case let .obstructed(height, target):
      "The desk stopped at \(format(height)) cm before reaching \(format(target)) cm. Check for obstructions."
    }
  }
}

func format(_ value: Double) -> String {
  String(format: "%.1f", value)
}

struct Candidate {
  let peripheral: CBPeripheral
  let name: String
  let rssi: Int?
  let connected: Bool
  let advertisesControlService: Bool
}

/// Resumes a continuation at most once, so timeouts and delegate callbacks can race safely.
/// Only touched from `BLE.queue`.
final class Pending<T> {
  private var continuation: CheckedContinuation<T, Error>?

  init(_ continuation: CheckedContinuation<T, Error>) {
    self.continuation = continuation
  }

  var isPending: Bool { continuation != nil }

  func succeed(_ value: T) {
    continuation?.resume(returning: value)
    continuation = nil
  }

  func fail(_ error: Error) {
    continuation?.resume(throwing: error)
    continuation = nil
  }
}

/// A thin async wrapper around CoreBluetooth. All delegate callbacks and state live on `queue`.
final class BLE: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate, @unchecked Sendable {
  private let queue = DispatchQueue(label: "com.raycast.linak-desk-controller.ble")
  private var central: CBCentralManager!

  private var poweredOn: [Pending<Void>] = []
  private var connection: Pending<Void>?
  private var connectingPeripheral: UUID?
  private var characteristicsDiscovery: Pending<Void>?
  private var pendingServices = 0
  private var reads: [CBUUID: Pending<Data>] = [:]
  private var writes: [CBUUID: Pending<Void>] = [:]

  private var candidates: [UUID: Candidate] = [:]
  private var scanFilter: ((Candidate) -> Bool)?
  private var scanCompletion: Pending<[Candidate]>?

  private(set) var characteristics: [CBUUID: CBCharacteristic] = [:]

  override init() {
    super.init()
    central = CBCentralManager(delegate: self, queue: queue)
  }

  private func run<T>(
    timeout: TimeInterval,
    onTimeout: @escaping @autoclosure () -> Error,
    _ start: @escaping (Pending<T>) -> Void
  ) async throws -> T {
    try await withCheckedThrowingContinuation { continuation in
      queue.async {
        let pending = Pending(continuation)
        start(pending)
        guard pending.isPending else { return }
        self.queue.asyncAfter(deadline: .now() + timeout) {
          pending.fail(onTimeout())
        }
      }
    }
  }

  // MARK: Central

  func waitUntilPoweredOn() async throws {
    debug("waiting for Bluetooth")
    try await run(timeout: 5, onTimeout: DeskError.bluetoothUnavailable) { (pending: Pending<Void>) in
      if let error = self.stateError() {
        pending.fail(error)
      } else if self.central.state == .poweredOn {
        pending.succeed(())
      } else {
        self.poweredOn.append(pending)
      }
    }
  }

  private func stateError() -> Error? {
    switch central.state {
    case .poweredOff: DeskError.bluetoothOff
    case .unauthorized: DeskError.bluetoothUnauthorized
    case .unsupported: DeskError.bluetoothUnavailable
    default: nil
    }
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    debug("central state \(central.state.rawValue)")
    if let error = stateError() {
      poweredOn.forEach { $0.fail(error) }
      poweredOn = []
    } else if central.state == .poweredOn {
      poweredOn.forEach { $0.succeed(()) }
      poweredOn = []
    }
  }

  func knownPeripheral(id: UUID) -> CBPeripheral? {
    queue.sync { central.retrievePeripherals(withIdentifiers: [id]).first }
  }

  func connectedDesks() -> [Candidate] {
    queue.sync {
      central.retrieveConnectedPeripherals(withServices: [controlServiceUUID]).map {
        Candidate(peripheral: $0, name: $0.name ?? "Desk", rssi: nil, connected: true, advertisesControlService: true)
      }
    }
  }

  /// Scans for nearby desks. Stops early once a candidate satisfying `stopWhen` shows up.
  func scan(timeout: TimeInterval, stopWhen: ((Candidate) -> Bool)? = nil) async -> [Candidate] {
    let result: [Candidate]? = try? await run(timeout: timeout + 1, onTimeout: DeskError.noDeskFound) {
      (pending: Pending<[Candidate]>) in
      self.candidates = [:]
      self.scanFilter = stopWhen
      self.scanCompletion = pending
      self.central.scanForPeripherals(withServices: nil, options: nil)
      self.queue.asyncAfter(deadline: .now() + timeout) { self.finishScan() }
    }
    return result ?? []
  }

  private func finishScan() {
    guard let completion = scanCompletion else { return }
    debug("scan finished with \(candidates.count) candidates")
    central.stopScan()
    scanCompletion = nil
    scanFilter = nil
    completion.succeed(candidates.values.sorted { ($0.rssi ?? -999) > ($1.rssi ?? -999) })
  }

  func centralManager(
    _ central: CBCentralManager,
    didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any],
    rssi RSSI: NSNumber
  ) {
    let name = advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? peripheral.name
    let services = advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID] ?? []
    let advertisesControlService = services.contains(controlServiceUUID)
    let looksLikeDesk = name?.localizedCaseInsensitiveContains("desk") == true
    guard advertisesControlService || looksLikeDesk else { return }
    debug("found \(name ?? "?") \(peripheral.identifier) services \(services) rssi \(RSSI)")

    let rssi = RSSI.intValue == 127 ? nil : RSSI.intValue
    let candidate = Candidate(
      peripheral: peripheral,
      name: name ?? "Desk",
      rssi: rssi,
      connected: peripheral.state == .connected,
      advertisesControlService: advertisesControlService
    )
    candidates[peripheral.identifier] = candidate
    if scanFilter?(candidate) == true {
      finishScan()
    }
  }

  // MARK: Connection

  func connect(_ peripheral: CBPeripheral) async throws {
    do {
      try await run(timeout: 10, onTimeout: DeskError.connectionTimedOut) { (pending: Pending<Void>) in
        peripheral.delegate = self
        if peripheral.state == .connected {
          pending.succeed(())
          return
        }
        self.connection = pending
        self.connectingPeripheral = peripheral.identifier
        debug("connecting \(peripheral.identifier) state \(peripheral.state.rawValue)")
        self.central.connect(peripheral, options: nil)
      }
      try await run(timeout: 10, onTimeout: DeskError.notALinakDesk) { (pending: Pending<Void>) in
        self.characteristics = [:]
        self.characteristicsDiscovery = pending
        peripheral.discoverServices([controlServiceUUID, outputServiceUUID, inputServiceUUID])
      }
    } catch {
      disconnect(peripheral)
      throw error
    }
  }

  func disconnect(_ peripheral: CBPeripheral) {
    queue.sync { central.cancelPeripheralConnection(peripheral) }
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    debug("connected \(peripheral.identifier)")
    // Ignore late callbacks from a candidate we already gave up on.
    guard peripheral.identifier == connectingPeripheral else { return }
    connection?.succeed(())
    connection = nil
  }

  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
    debug("failed to connect: \(String(describing: error))")
    guard peripheral.identifier == connectingPeripheral else { return }
    connection?.fail(DeskError.connectionFailed(error?.localizedDescription))
    connection = nil
  }

  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
    debug("disconnected: \(String(describing: error))")
    let error = DeskError.communicationFailed("the desk disconnected")
    connection?.fail(error)
    characteristicsDiscovery?.fail(error)
    reads.values.forEach { $0.fail(error) }
    writes.values.forEach { $0.fail(error) }
    connection = nil
    characteristicsDiscovery = nil
    reads = [:]
    writes = [:]
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    debug("services \(peripheral.services?.map(\.uuid) ?? []) error \(String(describing: error))")
    if let error {
      characteristicsDiscovery?.fail(mapError(error))
      return
    }
    let services = peripheral.services ?? []
    guard !services.isEmpty else {
      characteristicsDiscovery?.fail(DeskError.notALinakDesk)
      return
    }
    pendingServices = services.count
    for service in services {
      peripheral.discoverCharacteristics(
        [controlCharacteristicUUID, outputCharacteristicUUID, inputCharacteristicUUID],
        for: service
      )
    }
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    if let error {
      characteristicsDiscovery?.fail(mapError(error))
      return
    }
    for characteristic in service.characteristics ?? [] {
      characteristics[characteristic.uuid] = characteristic
    }
    pendingServices -= 1
    guard pendingServices == 0 else { return }
    let required = [controlCharacteristicUUID, outputCharacteristicUUID, inputCharacteristicUUID]
    if required.allSatisfy({ characteristics[$0] != nil }) {
      characteristicsDiscovery?.succeed(())
    } else {
      characteristicsDiscovery?.fail(DeskError.notALinakDesk)
    }
  }

  // MARK: Reads & writes

  func read(_ uuid: CBUUID, from peripheral: CBPeripheral) async throws -> Data {
    try await run(timeout: 5, onTimeout: DeskError.communicationFailed("reading the height timed out")) {
      (pending: Pending<Data>) in
      guard let characteristic = self.characteristics[uuid] else {
        pending.fail(DeskError.notALinakDesk)
        return
      }
      self.reads[uuid]?.fail(DeskError.communicationFailed("overlapping reads"))
      self.reads[uuid] = pending
      peripheral.readValue(for: characteristic)
    }
  }

  func write(_ data: Data, to uuid: CBUUID, on peripheral: CBPeripheral) async throws {
    try await run(timeout: 5, onTimeout: DeskError.communicationFailed("the desk didn't respond")) {
      (pending: Pending<Void>) in
      guard let characteristic = self.characteristics[uuid] else {
        pending.fail(DeskError.notALinakDesk)
        return
      }
      if characteristic.properties.contains(.write) {
        self.writes[uuid]?.fail(DeskError.communicationFailed("overlapping writes"))
        self.writes[uuid] = pending
        peripheral.writeValue(data, for: characteristic, type: .withResponse)
      } else {
        peripheral.writeValue(data, for: characteristic, type: .withoutResponse)
        pending.succeed(())
      }
    }
  }

  func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    debug("read \(characteristic.uuid) \(characteristic.value.map { Array($0) } ?? []) error \(String(describing: error))")
    guard let pending = reads.removeValue(forKey: characteristic.uuid) else { return }
    if let error {
      pending.fail(mapError(error))
    } else {
      pending.succeed(characteristic.value ?? Data())
    }
  }

  func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
    guard let pending = writes.removeValue(forKey: characteristic.uuid) else { return }
    if let error {
      pending.fail(mapError(error))
    } else {
      pending.succeed(())
    }
  }

  private func mapError(_ error: Error) -> Error {
    if let error = error as? CBATTError,
      [.insufficientAuthentication, .insufficientEncryption, .insufficientAuthorization].contains(error.code)
    {
      return DeskError.pairingRequired
    }
    if let error = error as? CBError, [.peerRemovedPairingInformation, .encryptionTimedOut].contains(error.code) {
      return DeskError.pairingRequired
    }
    return DeskError.communicationFailed(error.localizedDescription)
  }
}
