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
/// within `refineFor` of the first fix.
@raycast func currentLocation() async throws -> Location {
  let location = try await withThrowingTaskGroup(of: CLLocation?.self) { group in
    group.addTask { try await bestFix() }
    group.addTask {
      try await Task.sleep(for: timeout)
      return nil
    }
    let first = try await group.next() ?? nil
    group.cancelAll()
    return first
  }

  guard let location else { throw LocationError.timeout }
  return Location(
    latitude: location.coordinate.latitude,
    longitude: location.coordinate.longitude,
    accuracy: location.horizontalAccuracy
  )
}

private func bestFix() async throws -> CLLocation? {
  let clock = ContinuousClock()
  var best: CLLocation?
  var firstFixAt: ContinuousClock.Instant?

  for try await update in CLLocationUpdate.liveUpdates() {
    if update.authorizationDenied || update.authorizationDeniedGlobally || update.authorizationRestricted {
      throw LocationError.denied
    }
    guard let location = update.location, location.horizontalAccuracy >= 0 else { continue }
    if location.horizontalAccuracy <= goodAccuracy { return location }
    if best.map({ location.horizontalAccuracy < $0.horizontalAccuracy }) ?? true { best = location }

    let start = firstFixAt ?? clock.now
    firstFixAt = start
    if clock.now - start >= refineFor { return best }
  }
  return best
}
