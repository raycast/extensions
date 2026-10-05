import CoreBluetooth
import Foundation

struct Reading {
  let heightCm: Double
  let speed: Double
}

struct MoveResult {
  let reading: Reading
  /// True when a newer command for the same desk took over before the target was reached.
  let cancelled: Bool
}

/// The most recent move/stop request for one desk. A running move gives up as soon as a newer request replaces it,
/// so pressing Stop (or another preset) never fights a desk that is already moving. Requests are kept per desk,
/// so commands for different desks never cancel each other.
///
/// Claiming and "check the request, then write the target" run under the same file lock. Once `claim()` returns,
/// no move can still have a target write in flight, and every later write by an older move is refused.
struct Request {
  private let url: URL
  private let lockPath: String

  init(deskId: UUID) {
    let base = FileManager.default.temporaryDirectory
      .appendingPathComponent("com.raycast.linak-desk-controller.\(deskId.uuidString)")
    url = base.appendingPathExtension("request")
    lockPath = base.appendingPathExtension("lock").path
  }

  func claim() async throws -> String {
    try await locked {
      let id = UUID().uuidString
      do {
        try id.write(to: url, atomically: true, encoding: .utf8)
      } catch {
        throw DeskError.requestUnavailable(error.localizedDescription)
      }
      return id
    }
  }

  /// Runs `body` only if `id` is still the newest request, holding off any newer claim until it finishes.
  /// Returns false, without running `body`, when a newer request has taken over.
  func perform(ifCurrent id: String, _ body: () async throws -> Void) async throws -> Bool {
    try await locked {
      guard (try? String(contentsOf: url, encoding: .utf8)) == id else { return false }
      try await body()
      return true
    }
  }

  private func locked<T>(_ body: () async throws -> T) async throws -> T {
    let descriptor = open(lockPath, O_CREAT | O_RDWR, 0o600)
    guard descriptor >= 0 else { throw DeskError.requestUnavailable(String(cString: strerror(errno))) }
    defer { close(descriptor) }
    guard flock(descriptor, LOCK_EX) == 0 else {
      throw DeskError.requestUnavailable(String(cString: strerror(errno)))
    }
    defer { flock(descriptor, LOCK_UN) }
    return try await body()
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

  /// Connects to the desk with the given CoreBluetooth identifier, or the only desk found when `deskId` is empty.
  static func open(deskId: String, baseHeightCm: Double) async throws -> DeskSession {
    let ble = BLE()
    try await ble.waitUntilPoweredOn()

    let candidates: [Candidate]
    if deskId.isEmpty {
      let connected = ble.connectedDesks()
      if connected.count > 1 { throw DeskError.multipleDesksFound }
      if let first = connected.first {
        candidates = [first]
      } else {
        // IDÅSEN desks only advertise their name, so name matches are only candidates: connecting validates each one.
        let found = await ble.scan(timeout: 8)
        let advertising = found.filter(\.advertisesControlService)
        // Several desks in range: guessing could move someone else's desk.
        if advertising.count > 1 { throw DeskError.multipleDesksFound }
        candidates = advertising + found.filter { !$0.advertisesControlService }
        if candidates.isEmpty { throw DeskError.noDeskFound }
      }
    } else {
      guard let id = UUID(uuidString: deskId) else { throw DeskError.invalidDeskId(deskId) }
      if let peripheral = ble.knownPeripheral(id: id) {
        candidates = [
          Candidate(
            peripheral: peripheral, name: peripheral.name ?? "Desk", rssi: nil,
            connected: peripheral.state == .connected, advertisesControlService: true
          )
        ]
      } else {
        let found = await ble.scan(timeout: 8) { $0.peripheral.identifier == id }
        // This Mac has never seen the desk. The TypeScript side may retry with discovery for a stale preference.
        guard let match = found.first(where: { $0.peripheral.identifier == id }) else {
          throw DeskError.deskNotFound
        }
        candidates = [match]
      }
    }

    var failure: Error?
    for candidate in candidates {
      do {
        try await ble.connect(candidate.peripheral)
        return DeskSession(
          ble: ble,
          peripheral: candidate.peripheral,
          name: candidate.peripheral.name ?? candidate.name,
          baseHeightCm: baseHeightCm
        )
      } catch {
        // Not every device with "desk" in its name is a Linak desk, so move on to the next one.
        // Prefer reporting a real connection problem over "not a Linak desk".
        if failure == nil || (failure as? DeskError)?.isNotALinakDesk == true { failure = error }
      }
    }
    throw failure ?? DeskError.noDeskFound
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

  /// Stops the desk unless a newer command has taken over, so a slow move never interrupts its replacement.
  private func stopIfCurrent(_ request: Request, _ requestId: String) async throws {
    _ = try await request.perform(ifCurrent: requestId) { try await sendStop() }
  }

  /// Moves to `targetCm` by repeatedly writing the target to the reference input, like the desk's own app does.
  /// When `stopAtLimit` is set, reaching a physical limit counts as done rather than an obstruction.
  /// Returns a cancelled result, without stopping the desk, when a newer command for it takes over.
  func move(to targetCm: Double, request: Request, requestId: String, stopAtLimit: Bool = false) async throws
    -> MoveResult
  {
    let raw = ((targetCm - baseHeightCm) * 100).rounded()
    guard raw >= 0, raw <= Double(UInt16.max) else { throw DeskError.invalidTarget(targetCm) }
    let target = UInt16(raw)
    let targetData = Data([UInt8(target & 0xFF), UInt8(target >> 8)])

    var reading = try await readHeight()
    if abs(reading.heightCm - targetCm) <= Self.tolerance { return MoveResult(reading: reading, cancelled: false) }

    try await ble.write(Self.wake, to: controlCharacteristicUUID, on: peripheral)
    try await stopIfCurrent(request, requestId)
    try await Task.sleep(nanoseconds: 200_000_000)

    let startedAt = Date()
    var previous = reading
    var stationaryReadings = 0
    // A desk that has been idle for a while can ignore target writes until it has been woken more than once.
    var hasMoved = false
    var lastWake = Date()

    while true {
      if Date().timeIntervalSince(startedAt) > Self.movementTimeout {
        try? await stopIfCurrent(request, requestId)
        throw DeskError.movementTimedOut
      }

      // A newer request took over: leave the desk to it instead of sending a competing target or stop.
      // The check and the write are atomic with respect to a newer claim, so a Stop can't be overtaken by this write.
      let written = try await request.perform(ifCurrent: requestId) {
        try await ble.write(targetData, to: inputCharacteristicUUID, on: peripheral)
      }
      guard written else { return MoveResult(reading: reading, cancelled: true) }
      try await Task.sleep(nanoseconds: 400_000_000)
      reading = try await readHeight()

      let isStationary = abs(reading.speed) < 0.01 && abs(reading.heightCm - previous.heightCm) < 0.05
      if isStationary, abs(reading.heightCm - targetCm) <= Self.tolerance { break }
      if !isStationary { hasMoved = true }

      if !hasMoved, Date().timeIntervalSince(lastWake) >= 1 {
        let woken = try await request.perform(ifCurrent: requestId) {
          try await ble.write(Self.wake, to: controlCharacteristicUUID, on: peripheral)
        }
        guard woken else { return MoveResult(reading: reading, cancelled: true) }
        lastWake = Date()
      }

      // Give a sleeping desk a few seconds to start before treating it as stalled.
      let startGrace: TimeInterval = hasMoved ? 2 : 5
      stationaryReadings =
        isStationary && Date().timeIntervalSince(startedAt) > startGrace ? stationaryReadings + 1 : 0
      if stationaryReadings >= 4 {
        try? await stopIfCurrent(request, requestId)
        if stopAtLimit { return MoveResult(reading: reading, cancelled: false) }
        throw DeskError.obstructed(heightCm: reading.heightCm, targetCm: targetCm)
      }
      previous = reading
    }

    try await stopIfCurrent(request, requestId)
    return MoveResult(reading: reading, cancelled: false)
  }
}
