import Foundation
import RaycastSwiftMacros

struct DeskStatus: Encodable {
  let id: String
  let name: String
  let heightCm: Double
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

@raycast func moveDesk(deskId: String, targetCm: Double, baseHeightCm: Double) async throws -> DeskStatus {
  let request = Request.claim()
  let session = try await DeskSession.open(deskId: deskId, baseHeightCm: baseHeightCm)
  defer { session.close() }
  return status(session, try await session.move(to: targetCm, request: request))
}

@raycast func nudgeDesk(deskId: String, deltaCm: Double, baseHeightCm: Double) async throws -> DeskStatus {
  let request = Request.claim()
  let session = try await DeskSession.open(deskId: deskId, baseHeightCm: baseHeightCm)
  defer { session.close() }
  let current = try await session.readHeight()
  let target = max(baseHeightCm, current.heightCm + deltaCm)
  return status(session, try await session.move(to: target, request: request, stopAtLimit: true))
}

@raycast func stopDesk(deskId: String, baseHeightCm: Double) async throws -> DeskStatus {
  _ = Request.claim()
  let session = try await DeskSession.open(deskId: deskId, baseHeightCm: baseHeightCm)
  defer { session.close() }
  try await session.sendStop()
  // A move running in another process may still send one more target after we claimed the request.
  try await Task.sleep(nanoseconds: 500_000_000)
  try await session.sendStop()
  return status(session, try await session.readHeight())
}

private func status(_ session: DeskSession, _ reading: Reading) -> DeskStatus {
  DeskStatus(
    id: session.peripheral.identifier.uuidString,
    name: session.name,
    heightCm: (reading.heightCm * 10).rounded() / 10
  )
}
