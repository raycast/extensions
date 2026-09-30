import CoreBluetooth
import Foundation

struct Reading {
  let heightCm: Double
  let speed: Double
}

/// The most recent move/stop request. A running move gives up as soon as a newer request replaces it,
/// so pressing Stop (or another preset) never fights a desk that is already moving.
enum Request {
  private static let url = FileManager.default.temporaryDirectory
    .appendingPathComponent("com.raycast.linak-desk-controller.request")

  static func claim() -> String {
    let id = UUID().uuidString
    try? id.write(to: url, atomically: true, encoding: .utf8)
    return id
  }

  static func isCurrent(_ id: String) -> Bool {
    (try? String(contentsOf: url, encoding: .utf8)) == id
  }
}

final class DeskSession {
  private static let wake = Data([0xFE, 0x00])
  private static let stop = Data([0xFF, 0x00])
  private static let tolerance = 0.5
  private static let movementTimeout: TimeInterval = 60

  let ble: BLE
  let peripheral: CBPeripheral
  let name: String
  let baseHeightCm: Double

  private init(ble: BLE, peripheral: CBPeripheral, name: String, baseHeightCm: Double) {
    self.ble = ble
    self.peripheral = peripheral
    self.name = name
    self.baseHeightCm = baseHeightCm
  }

  /// Connects to the desk with the given CoreBluetooth identifier, or the first desk found when `deskId` is empty.
  static func open(deskId: String, baseHeightCm: Double) async throws -> DeskSession {
    let ble = BLE()
    try await ble.waitUntilPoweredOn()

    let candidate: Candidate
    if deskId.isEmpty {
      if let connected = ble.connectedDesks().first {
        candidate = connected
      } else {
        // IDÅSEN desks only advertise their name, so take the first desk-like device; connecting validates it.
        let found = await ble.scan(timeout: 8) { _ in true }
        guard let first = found.first(where: \.advertisesControlService) ?? found.first else {
          throw DeskError.noDeskFound
        }
        candidate = first
      }
    } else {
      guard let id = UUID(uuidString: deskId) else { throw DeskError.invalidDeskId(deskId) }
      if let peripheral = ble.knownPeripheral(id: id) {
        candidate = Candidate(
          peripheral: peripheral, name: peripheral.name ?? "Desk", rssi: nil,
          connected: peripheral.state == .connected, advertisesControlService: true
        )
      } else {
        let found = await ble.scan(timeout: 8) { $0.peripheral.identifier == id }
        guard let match = found.first(where: { $0.peripheral.identifier == id }) else {
          throw DeskError.deskNotFound
        }
        candidate = match
      }
    }

    try await ble.connect(candidate.peripheral)
    return DeskSession(
      ble: ble,
      peripheral: candidate.peripheral,
      name: candidate.peripheral.name ?? candidate.name,
      baseHeightCm: baseHeightCm
    )
  }

  func close() {
    ble.disconnect(peripheral)
  }

  func readHeight() async throws -> Reading {
    let data = try await ble.read(outputCharacteristicUUID, from: peripheral)
    guard data.count >= 4 else { throw DeskError.communicationFailed("unexpected height data") }
    let rawHeight = UInt16(data[0]) | UInt16(data[1]) << 8
    let rawSpeed = Int16(bitPattern: UInt16(data[2]) | UInt16(data[3]) << 8)
    return Reading(heightCm: baseHeightCm + Double(rawHeight) / 100, speed: Double(rawSpeed) / 100)
  }

  func sendStop() async throws {
    try await ble.write(Self.stop, to: controlCharacteristicUUID, on: peripheral)
  }

  /// Moves to `targetCm` by repeatedly writing the target to the reference input, like the desk's own app does.
  /// When `stopAtLimit` is set, reaching a physical limit counts as done rather than an obstruction.
  func move(to targetCm: Double, request: String, stopAtLimit: Bool = false) async throws -> Reading {
    let raw = ((targetCm - baseHeightCm) * 100).rounded()
    guard raw >= 0, raw <= Double(UInt16.max) else { throw DeskError.invalidTarget(targetCm) }
    let target = UInt16(raw)
    let targetData = Data([UInt8(target & 0xFF), UInt8(target >> 8)])

    var reading = try await readHeight()
    if abs(reading.heightCm - targetCm) <= Self.tolerance { return reading }

    try await ble.write(Self.wake, to: controlCharacteristicUUID, on: peripheral)
    try await sendStop()
    try await Task.sleep(nanoseconds: 200_000_000)

    let startedAt = Date()
    var previous = reading
    var stationaryReadings = 0

    while true {
      // A newer request took over: leave the desk to it instead of sending a competing stop.
      guard Request.isCurrent(request) else { return reading }

      if Date().timeIntervalSince(startedAt) > Self.movementTimeout {
        try? await sendStop()
        throw DeskError.movementTimedOut
      }

      try await ble.write(targetData, to: inputCharacteristicUUID, on: peripheral)
      try await Task.sleep(nanoseconds: 400_000_000)
      reading = try await readHeight()

      let isStationary = abs(reading.speed) < 0.01 && abs(reading.heightCm - previous.heightCm) < 0.05
      if isStationary, abs(reading.heightCm - targetCm) <= Self.tolerance { break }

      stationaryReadings = isStationary && Date().timeIntervalSince(startedAt) > 2 ? stationaryReadings + 1 : 0
      if stationaryReadings >= 4 {
        try? await sendStop()
        if stopAtLimit { return reading }
        throw DeskError.obstructed(heightCm: reading.heightCm, targetCm: targetCm)
      }
      previous = reading
    }

    try await sendStop()
    return reading
  }
}
