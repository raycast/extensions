import Foundation
import RaycastSwiftMacros

struct DeskStatus: Encodable {
  let id: String
  let name: String
  let heightCm: Double
  /// True when a newer command for the same desk took over before a move reached its target.
  let cancelled: Bool
}

struct DiscoveredDesk: Encodable {
  let id: String
  let name: String
  let rssi: Int?
  let connected: Bool
}

@raycast func discoverDesks(timeoutSeconds: Double) async throws -> [DiscoveredDesk] {
  let ble = BLE()
  try await ble.waitUntilPoweredOn()
  let connected = ble.connectedDesks()
  let nearby = await ble.scan(timeout: timeoutSeconds)
  var seen = Set<UUID>()
  return (connected + nearby).compactMap { candidate in
    guard seen.insert(candidate.peripheral.identifier).inserted else { return nil }
    return DiscoveredDesk(
      id: candidate.peripheral.identifier.uuidString,
      name: candidate.name,
      rssi: candidate.rssi,
      connected: candidate.connected
    )
  }
}

@raycast func getDeskStatus(deskId: String, baseHeightCm: Double) async throws -> DeskStatus {
  let session = try await DeskSession.open(deskId: deskId, baseHeightCm: baseHeightCm)
  defer { session.close() }
  return status(session, try await session.readHeight())
}

// Requests are claimed only once connected, so a command that can't reach the desk never cancels a running move.

@raycast func moveDesk(deskId: String, targetCm: Double, baseHeightCm: Double) async throws -> DeskStatus {
  let session = try await DeskSession.open(deskId: deskId, baseHeightCm: baseHeightCm)
  defer { session.close() }
  let request = Request(deskId: session.peripheral.identifier)
  let id = try await request.claim()
  return status(session, try await session.move(to: targetCm, request: request, requestId: id))
}

@raycast func nudgeDesk(deskId: String, deltaCm: Double, baseHeightCm: Double) async throws -> DeskStatus {
  let session = try await DeskSession.open(deskId: deskId, baseHeightCm: baseHeightCm)
  defer { session.close() }
  let request = Request(deskId: session.peripheral.identifier)
  let id = try await request.claim()
  let current = try await session.readHeight()
  let target = max(baseHeightCm, current.heightCm + deltaCm)
  return status(session, try await session.move(to: target, request: request, requestId: id, stopAtLimit: true))
}

@raycast func stopDesk(deskId: String, baseHeightCm: Double) async throws -> DeskStatus {
  let session = try await DeskSession.open(deskId: deskId, baseHeightCm: baseHeightCm)
  defer { session.close() }
  // Claiming waits for any in-flight target write from a running move and refuses all later ones,
  // so a single stop is enough.
  _ = try await Request(deskId: session.peripheral.identifier).claim()
  try await session.sendStop()
  return status(session, try await session.readHeight())
}

private func status(_ session: DeskSession, _ reading: Reading, cancelled: Bool = false) -> DeskStatus {
  DeskStatus(
    id: session.peripheral.identifier.uuidString,
    name: session.name,
    heightCm: (reading.heightCm * 10).rounded() / 10,
    cancelled: cancelled
  )
}

private func status(_ session: DeskSession, _ result: MoveResult) -> DeskStatus {
  status(session, result.reading, cancelled: result.cancelled)
}
