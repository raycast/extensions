import CoreLocation
import Foundation
import RaycastSwiftMacros

// `currentLocation` runs inside "Raycast Geolocation.app", which src/location-app.ts assembles from this
// binary, because macOS only shows the location prompt to an app bundle.

struct Location: Encodable {
  let latitude: Double
  let longitude: Double
  let accuracy: Double
}

enum LocationError: Error {
  case denied
  case timeout
}

/// Fixes at or below this accuracy (in meters) are returned immediately.
private let goodAccuracy: CLLocationAccuracy = 100
/// How long to keep waiting for a better fix once any fix has arrived.
private let refineFor: Duration = .seconds(5)
/// Leaves time to answer the first-time permission prompt.
private let timeout: Duration = .seconds(60)

/// Waits for a fix from Core Location. Returns the first accurate fix, or the best one received
/// within `refineFor` of the first fix, even if no further updates arrive.
@raycast func currentLocation() async throws -> Location {
  let fixes = Fixes()

  let accurate = try await withThrowingTaskGroup(of: CLLocation?.self) { group in
    group.addTask { try await watchUpdates(into: fixes) }
    group.addTask {
      try await fixes.waitForFirstFix()
      try await Task.sleep(for: refineFor)
      return nil
    }
    group.addTask {
      try await Task.sleep(for: timeout)
      return nil
    }
    let first = try await group.next() ?? nil
    group.cancelAll()
    return first
  }

  let best = await fixes.best
  guard let location = accurate ?? best else { throw LocationError.timeout }
  return Location(
    latitude: location.coordinate.latitude,
    longitude: location.coordinate.longitude,
    accuracy: location.horizontalAccuracy
  )
}

/// Returns the first fix within `goodAccuracy`; records less accurate fixes in `fixes`.
private func watchUpdates(into fixes: Fixes) async throws -> CLLocation? {
  for try await update in CLLocationUpdate.liveUpdates() {
    if update.authorizationDenied || update.authorizationDeniedGlobally || update.authorizationRestricted {
      throw LocationError.denied
    }
    guard let location = update.location, location.horizontalAccuracy >= 0 else { continue }
    if location.horizontalAccuracy <= goodAccuracy { return location }
    await fixes.offer(location)
  }
  // The updates ended without an accurate fix: wait for the refine or overall deadline.
  try await Task.sleep(for: timeout)
  return nil
}

private actor Fixes {
  private(set) var best: CLLocation?

  func offer(_ location: CLLocation) {
    if best.map({ location.horizontalAccuracy < $0.horizontalAccuracy }) ?? true { best = location }
  }

  /// Polls with a cancellable sleep, so cancelling the task group never leaves this waiting.
  nonisolated func waitForFirstFix() async throws {
    while await best == nil {
      try await Task.sleep(for: .milliseconds(100))
    }
  }
}
