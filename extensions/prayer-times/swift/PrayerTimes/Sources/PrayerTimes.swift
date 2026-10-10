import CoreLocation
import EventKit
import Foundation
import RaycastSwiftMacros

// Prayer reminders are identified by a marker line in their notes:
//   prayer-times://<YYYY-MM-DD>/<fajr|dhuhr|asr|maghrib|isha>
// (iCloud Reminders doesn't keep EKReminder.url, so the url is set too but only read as a fallback.)
// Other tools that sync these reminders should treat the marker as the key and leave title, dates
// and alarms alone; the title can change (Friday's Dhuhr is titled for Jumu'ah). This file only writes isCompleted from setPrayerCompleted.
//
// The `@raycast` functions are called from src/lib/helper.ts through Raycast's Swift bridge.
// `locate` also runs inside "Prayer Times Location.app", which the extension assembles from this
// binary at runtime, because macOS only shows the location prompt to an app bundle.

let urlPrefix = "prayer-times://"

struct PlannedReminder: Codable {
  /// `YYYY-MM-DD/<slug>`, appended to the URL prefix.
  let key: String
  let title: String
  /// ISO 8601 instant.
  let due: String
  /// ISO 8601 instants for absolute alarms.
  let alarms: [String]
  let notes: String
}

struct SyncPayload: Codable {
  let listName: String
  let reminders: [PlannedReminder]
  /// Days a missed prayer keeps its due date; 0 never removes it. Defaults to `staleAfterDays`.
  let staleAfterDays: Int?
}

struct SyncResult: Codable {
  let created: Int
  let updated: Int
  let unchanged: Int
  let skippedCompleted: Int
  /// Missed prayers older than `staleAfterDays` whose due date was removed.
  let undated: Int
  let listCreated: Bool
}

/// Default for how long a missed prayer keeps its due date (and so shows as overdue in Reminders'
/// Today list and in Calendar): the window Raycast's history offers for marking it prayed late.
let staleAfterDays = 7

struct PrayerStatus: Codable {
  let key: String
  let isCompleted: Bool
  let completionDate: String?
}

enum PrayerRemindersError: Error, LocalizedError, CustomStringConvertible {
  case accessDenied
  case noSource
  case badDate(String)
  case duplicateLists(String, Int)
  case locationDenied
  case locationUnavailable(String)

  var errorDescription: String? {
    switch self {
    case .accessDenied:
      return "Reminders access denied. Allow Raycast in System Settings → Privacy & Security → Reminders."
    case .noSource:
      return "No account available to create a Reminders list in."
    case .badDate(let value):
      return "Invalid date: \(value)"
    case .duplicateLists(let name, let count):
      return "\(count) Reminders lists are named \"\(name)\". Rename or remove the extras so prayers sync to one list."
    case .locationDenied:
      return "Location access denied. Allow Prayer Times Location in System Settings → Privacy & Security → Location Services."
    case .locationUnavailable(let reason):
      return "Could not get the current location: \(reason)"
    }
  }

  /// The Swift bridge prints thrown errors with `print`, which uses this.
  var description: String { errorDescription ?? "Unknown error" }
}

private func authorizedStore() async throws -> EKEventStore {
  let store = EKEventStore()
  let granted: Bool
  if #available(macOS 14.0, *) {
    granted = try await store.requestFullAccessToReminders()
  } else {
    granted = try await store.requestAccess(to: .reminder)
  }
  guard granted else { throw PrayerRemindersError.accessDenied }
  return store
}

private func parseDate(_ value: String) throws -> Date {
  let withFraction = ISO8601DateFormatter()
  withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  if let date = withFraction.date(from: value) { return date }
  let plain = ISO8601DateFormatter()
  if let date = plain.date(from: value) { return date }
  throw PrayerRemindersError.badDate(value)
}

private func formatDate(_ date: Date) -> String {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter.string(from: date)
}

/// The single list with this title. Several lists with the same title (e.g. iCloud and On My Mac)
/// is an error rather than a guess.
private func findList(_ store: EKEventStore, named name: String) throws -> EKCalendar? {
  let matches = store.calendars(for: .reminder).filter { $0.title == name }
  if matches.count > 1 { throw PrayerRemindersError.duplicateLists(name, matches.count) }
  return matches.first
}

private func createList(_ store: EKEventStore, named name: String) throws -> EKCalendar {
  let calendar = EKCalendar(for: .reminder, eventStore: store)
  calendar.title = name
  guard let source = store.defaultCalendarForNewReminders()?.source ?? store.sources.first else {
    throw PrayerRemindersError.noSource
  }
  calendar.source = source
  try store.saveCalendar(calendar, commit: true)
  return calendar
}

private func fetch(_ store: EKEventStore, _ predicate: NSPredicate) async -> [EKReminder] {
  await withCheckedContinuation { continuation in
    store.fetchReminders(matching: predicate) { reminders in
      continuation.resume(returning: reminders ?? [])
    }
  }
}

/// Start of a `YYYY-MM-DD` day in the local zone, shifted by `days`.
private func dayStart(_ key: String, plus days: Int = 0) -> Date? {
  let parts = key.split(separator: "-").compactMap { Int($0) }
  guard parts.count == 3 else { return nil }
  let start = Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
  return start.flatMap { Calendar.current.date(byAdding: .day, value: days, to: $0) }
}

/// Reminders that can belong to prayer days `fromDate`...`toDate`, without reading the whole list
/// (it holds a year of history, so a full read on every one-minute tick gets slow).
/// All open reminders are read (missed past days backfilled by the sync service have no due date,
/// so a due-date predicate would skip them); completed ones by completion time from two days before
/// `fromDate` onwards, since a prayer can be marked days later. Callers filter by the marker date.
private func fetchReminders(_ store: EKEventStore, in calendar: EKCalendar, from fromDate: String, to toDate: String)
  async -> [EKReminder]
{
  guard let start = dayStart(fromDate, plus: -2), dayStart(toDate) != nil else {
    return await fetch(store, store.predicateForReminders(in: [calendar]))
  }
  async let open = fetch(
    store, store.predicateForIncompleteReminders(withDueDateStarting: nil, ending: nil, calendars: [calendar]))
  async let done = fetch(
    store, store.predicateForCompletedReminders(withCompletionDateStarting: start, ending: .distantFuture, calendars: [calendar]))
  return await open + done
}

private let markerPattern = try! NSRegularExpression(
  pattern: "prayer-times://(\\d{4}-\\d{2}-\\d{2}/(?:fajr|dhuhr|asr|maghrib|isha))")

private func markerKey(in text: String?) -> String? {
  guard let text else { return nil }
  let range = NSRange(text.startIndex..., in: text)
  guard let match = markerPattern.firstMatch(in: text, range: range),
    let keyRange = Range(match.range(at: 1), in: text)
  else { return nil }
  return String(text[keyRange])
}

/// The prayer key from the notes marker, or from the url where the store keeps it.
private func prayerKey(_ reminder: EKReminder) -> String? {
  markerKey(in: reminder.notes) ?? markerKey(in: reminder.url?.absoluteString)
}

/// `YYYY-MM-DD` of a reminder's due date components, used to adopt reminders created before the
/// notes marker existed.
private func dueDay(_ reminder: EKReminder) -> String? {
  guard let c = reminder.dueDateComponents, let y = c.year, let m = c.month, let d = c.day else { return nil }
  return String(format: "%04d-%02d-%02d", y, m, d)
}

/// One reminder per key. Duplicates are ignored rather than deleted; the winner is the earliest
/// creationDate, then the lowest calendarItemIdentifier, the same rule the sync service uses.
private func indexByKey(_ reminders: [EKReminder]) -> [String: EKReminder] {
  let ordered = reminders.sorted { a, b in
    let aDate = a.creationDate ?? .distantFuture
    let bDate = b.creationDate ?? .distantFuture
    if aDate != bDate { return aDate < bDate }
    return a.calendarItemIdentifier < b.calendarItemIdentifier
  }
  var index: [String: EKReminder] = [:]
  for reminder in ordered {
    if let key = prayerKey(reminder), index[key] == nil { index[key] = reminder }
  }
  return index
}

/// `YYYY-MM-DD` of an instant in the local zone, the same form as the marker date.
private func dateKey(_ date: Date) -> String {
  let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
  return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
}

private func minuteStamp(_ date: Date) -> Int {
  Int((date.timeIntervalSince1970 / 60).rounded())
}

private func dueDate(of reminder: EKReminder) -> Date? {
  guard let components = reminder.dueDateComponents else { return nil }
  return Calendar.current.date(from: components)
}

private func dueComponents(_ date: Date) -> DateComponents {
  var components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
  components.timeZone = TimeZone.current
  return components
}

/// Alarms are compared and written only when still in the future: past ones would fire on save,
/// and dropping them as time passes would otherwise look like a change on every run.
private func needsUpdate(_ reminder: EKReminder, due: Date, alarms: [Date], notes: String, now: Date) -> Bool {
  let currentDue = dueDate(of: reminder).map(minuteStamp)
  let currentAlarms = Set((reminder.alarms ?? []).compactMap { $0.absoluteDate }.filter { $0 > now }.map(minuteStamp))
  return currentDue != minuteStamp(due) || currentAlarms != Set(alarms.map(minuteStamp))
    || reminder.notes != notes
}

private func apply(_ reminder: EKReminder, due: Date, alarms: [Date], notes: String) {
  reminder.dueDateComponents = dueComponents(due)
  reminder.alarms = alarms.map { EKAlarm(absoluteDate: $0) }
  reminder.notes = notes
}

/// Create missing prayer reminders and move existing ones whose times changed.
/// Completed reminders are left untouched. Each existing reminder is refreshed right before it is
/// saved, so a completion written by the sync service in the meantime is not overwritten.
@raycast func syncPrayerReminders(payload: SyncPayload) async throws -> SyncResult {
  let store = try await authorizedStore()

  var listCreated = false
  let calendar: EKCalendar
  if let existing = try findList(store, named: payload.listName) {
    calendar = existing
  } else {
    calendar = try createList(store, named: payload.listName)
    listCreated = true
  }

  let days = payload.reminders.map { String($0.key.prefix(10)) }.sorted()
  let all = await fetchReminders(store, in: calendar, from: days.first ?? "", to: days.last ?? "")
  let index = indexByKey(all)
  // Reminders without a key (made before the notes marker) are adopted by title and due day.
  var unkeyed: [String: EKReminder] = [:]
  for reminder in all.sorted(by: { ($0.creationDate ?? .distantFuture) < ($1.creationDate ?? .distantFuture) })
  where prayerKey(reminder) == nil {
    if let day = dueDay(reminder), let title = reminder.title {
      let slot = "\(title)|\(day)"
      if unkeyed[slot] == nil { unkeyed[slot] = reminder }
    }
  }
  var created = 0
  var updated = 0
  var unchanged = 0
  var skippedCompleted = 0

  for plan in payload.reminders {
    let due = try parseDate(plan.due)
    let now = Date()
    let alarms = try plan.alarms.map(parseDate).filter { $0 > now }

    let existing = index[plan.key] ?? unkeyed.removeValue(forKey: "\(plan.title)|\(String(plan.key.prefix(10)))")
    if let reminder = existing {
      guard reminder.refresh() else { continue }
      if reminder.isCompleted {
        // Completion, due date and alarms stay as they are; only make sure the key is in the notes.
        if markerKey(in: reminder.notes) != plan.key {
          reminder.notes = plan.notes
          try store.save(reminder, commit: true)
          updated += 1
        } else {
          skippedCompleted += 1
        }
        continue
      }
      // Open reminders also follow title changes (e.g. Friday's Dhuhr titled for Jumu'ah).
      guard needsUpdate(reminder, due: due, alarms: alarms, notes: plan.notes, now: now) || reminder.title != plan.title
      else {
        unchanged += 1
        continue
      }
      apply(reminder, due: due, alarms: alarms, notes: plan.notes)
      reminder.title = plan.title
      try store.save(reminder, commit: true)
      updated += 1
    } else {
      let reminder = EKReminder(eventStore: store)
      reminder.calendar = calendar
      reminder.title = plan.title
      reminder.url = URL(string: urlPrefix + plan.key)
      apply(reminder, due: due, alarms: alarms, notes: plan.notes)
      try store.save(reminder, commit: true)
      created += 1
    }
  }

  // Missed prayers older than the window lose their date, so they drop out of Today and Calendar.
  // The day stays in the notes marker, so history still counts them as missed.
  let keepDays = payload.staleAfterDays ?? staleAfterDays
  let cutoff = dateKey(Calendar.current.date(byAdding: .day, value: -keepDays, to: Date())!)
  var undated = 0
  for reminder in all where keepDays > 0 && !reminder.isCompleted && reminder.dueDateComponents != nil {
    guard let key = prayerKey(reminder), String(key.prefix(10)) < cutoff, reminder.refresh(),
      !reminder.isCompleted
    else { continue }
    reminder.dueDateComponents = nil
    reminder.alarms = nil
    try store.save(reminder, commit: false)
    undated += 1
  }
  if undated > 0 { try store.commit() }

  return SyncResult(
    created: created, updated: updated, unchanged: unchanged, skippedCompleted: skippedCompleted,
    undated: undated, listCreated: listCreated)
}

/// Completion state of prayer reminders whose date is between `fromDate` and `toDate` (inclusive, YYYY-MM-DD).
@raycast func getPrayerStatuses(listName: String, fromDate: String, toDate: String) async throws -> [PrayerStatus] {
  let store = try await authorizedStore()
  guard let calendar = try findList(store, named: listName) else { return [] }

  return indexByKey(await fetchReminders(store, in: calendar, from: fromDate, to: toDate))
    .filter { key, _ in
      let date = String(key.prefix(10))
      return date >= fromDate && date <= toDate
    }
    .map { key, reminder in
      PrayerStatus(
        key: key,
        isCompleted: reminder.isCompleted,
        completionDate: reminder.completionDate.map(formatDate))
    }
    .sorted { $0.key < $1.key }
}

/// Tick or untick one prayer reminder, optionally with an explicit ISO 8601 completion time.
/// Returns false when no reminder exists for the key.
@raycast func setPrayerCompleted(listName: String, key: String, completed: Bool, completionDate: String?) async throws
  -> Bool
{
  let completionDate = try completionDate.map(parseDate)
  let store = try await authorizedStore()
  guard let calendar = try findList(store, named: listName),
    let reminder = indexByKey(
      await fetchReminders(store, in: calendar, from: String(key.prefix(10)), to: String(key.prefix(10))))[key],
    reminder.refresh()
  else { return false }

  if completed, let completionDate {
    if !reminder.isCompleted || reminder.completionDate.map(minuteStamp) != minuteStamp(completionDate) {
      reminder.isCompleted = true
      reminder.completionDate = completionDate
      try store.save(reminder, commit: true)
    }
  } else if reminder.isCompleted != completed {
    reminder.isCompleted = completed
    try store.save(reminder, commit: true)
  }
  return true
}

struct LocateResult: Codable {
  let latitude: Double
  let longitude: Double
  let accuracy: Double
  let locality: String?
  let administrativeArea: String?
  let country: String?
  let countryCode: String?
  let timezone: String?
}

/// CLLocationManager delivers callbacks on the run loop of the thread that created it, so this
/// runs on the main thread and spins the main run loop until a result arrives.
final class OneShotLocator: NSObject, CLLocationManagerDelegate {
  private let manager = CLLocationManager()
  private var result: Result<CLLocation, Error>?
  private var requested = false

  func locate(timeout: TimeInterval) throws -> CLLocation {
    manager.delegate = self
    // Prayer times only need the town: a few kilometers shifts them by seconds, so ask macOS for
    // its blurred (reduced accuracy) location rather than a precise one.
    manager.desiredAccuracy = kCLLocationAccuracyReduced
    handleAuthorization()
    let deadline = Date().addingTimeInterval(timeout)
    while result == nil && Date() < deadline {
      RunLoop.main.run(mode: .default, before: Date().addingTimeInterval(0.1))
    }
    switch result {
    case .success(let location): return location
    case .failure(let error): throw error
    case nil: throw PrayerRemindersError.locationUnavailable("timed out")
    }
  }

  private func handleAuthorization() {
    switch manager.authorizationStatus {
    case .notDetermined:
      manager.requestWhenInUseAuthorization()
    case .denied, .restricted:
      result = .failure(PrayerRemindersError.locationDenied)
    default:
      if !requested {
        requested = true
        manager.requestLocation()
      }
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if result == nil { handleAuthorization() }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    if let location = locations.last { result = .success(location) }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    if (error as? CLError)?.code == .denied {
      result = .failure(PrayerRemindersError.locationDenied)
    } else {
      result = .failure(PrayerRemindersError.locationUnavailable(error.localizedDescription))
    }
  }
}

/// Rounded to 2 decimals (about 1 km), so no precise position leaves this process.
private func rounded(_ value: Double) -> Double {
  (value * 100).rounded() / 100
}

/// One reduced-accuracy location fix with the place name when available. Only works inside
/// "Prayer Times Location.app" (see helper.ts); a bare executable gets no location prompt.
@raycast @MainActor func locate() async throws -> LocateResult {
  let location = try OneShotLocator().locate(timeout: 60)
  // Reverse geocoding only names the place; a failure still returns the coordinates.
  let placemark = try? await CLGeocoder().reverseGeocodeLocation(location).first
  return LocateResult(
    latitude: rounded(location.coordinate.latitude),
    longitude: rounded(location.coordinate.longitude),
    accuracy: location.horizontalAccuracy,
    locality: placemark?.locality,
    administrativeArea: placemark?.administrativeArea,
    country: placemark?.country,
    countryCode: placemark?.isoCountryCode,
    timezone: placemark?.timeZone?.identifier)
}
