import EventKit
import Foundation
import RaycastSwiftMacros

private struct EventPayload: Decodable {
  let title: String
  let startEpochMs: Double
  let endEpochMs: Double
  let location: String?
  let allDay: Bool
  let preferredCalendarIdentifier: String?
  let recurrence: RecurrencePayload?
}

private struct ReminderPayload: Decodable {
  let title: String
  let dueEpochMs: Double
  let allDay: Bool
  let notes: String?
  let preferredReminderCalendarIdentifier: String?
}

private struct RecurrencePayload: Decodable {
  let frequency: String
  let interval: Int?
  let weekday: Int?
  let dayOfMonth: Int?
  let end: RecurrenceEndPayload
}

private struct RecurrenceEndPayload: Decodable {
  let type: String
  let count: Int?
  let untilEpochMs: Double?
}

private struct CalendarItem: Encodable {
  let id: String
  let title: String
  let sourceTitle: String
}

private struct CalendarListOutput: Encodable {
  let defaultCalendarIdentifier: String?
  let calendars: [CalendarItem]
}

private struct ReminderListItem: Encodable {
  let id: String
  let title: String
  let sourceTitle: String
}

private struct ReminderListOutput: Encodable {
  let defaultReminderListIdentifier: String?
  let reminderLists: [ReminderListItem]
}

private struct BridgeFailure: Error, LocalizedError, CustomStringConvertible {
  let message: String

  var errorDescription: String? { message }
  var description: String { message }
}

@MainActor
@raycast
func listWritableCalendarsJSON() async throws -> String {
  let store = EKEventStore()
  try await requestEventAccess(store: store)

  let writableCalendars = store.calendars(for: .event)
    .filter(\.allowsContentModifications)
    .sorted(by: compareCalendars)
  let defaultCalendar = store.defaultCalendarForNewEvents
  let defaultIdentifier = defaultCalendar?.allowsContentModifications == true
    ? defaultCalendar?.calendarIdentifier
    : nil
  let calendars = writableCalendars.map {
    CalendarItem(id: $0.calendarIdentifier, title: $0.title, sourceTitle: $0.source.title)
  }

  return try encodeJSON(
    CalendarListOutput(defaultCalendarIdentifier: defaultIdentifier, calendars: calendars),
    failureMessage: "Failed to encode calendar list"
  )
}

@MainActor
@raycast
func listWritableReminderListsJSON() async throws -> String {
  let store = EKEventStore()
  try await requestReminderAccess(store: store)

  let writableLists = store.calendars(for: .reminder)
    .filter(\.allowsContentModifications)
    .sorted(by: compareCalendars)
  let defaultList = store.defaultCalendarForNewReminders()
  let defaultIdentifier = defaultList?.allowsContentModifications == true
    ? defaultList?.calendarIdentifier
    : nil
  let reminderLists = writableLists.map {
    ReminderListItem(id: $0.calendarIdentifier, title: $0.title, sourceTitle: $0.source.title)
  }

  return try encodeJSON(
    ReminderListOutput(defaultReminderListIdentifier: defaultIdentifier, reminderLists: reminderLists),
    failureMessage: "Failed to encode reminder list output"
  )
}

@MainActor
@raycast
func createCalendarEvent(payloadBase64: String) async throws -> String {
  let payload: EventPayload = try decodePayload(payloadBase64)
  let store = EKEventStore()
  try await requestEventAccess(store: store)

  let calendar = try resolveCalendar(store: store, preferredIdentifier: payload.preferredCalendarIdentifier)
  let event = EKEvent(eventStore: store)
  event.title = payload.title
  event.startDate = Date(timeIntervalSince1970: payload.startEpochMs / 1000)
  event.endDate = Date(timeIntervalSince1970: payload.endEpochMs / 1000)
  event.isAllDay = payload.allDay
  event.calendar = calendar

  if let location = payload.location?.trimmingCharacters(in: .whitespacesAndNewlines), !location.isEmpty {
    event.location = location
  }
  if let recurrence = payload.recurrence {
    try applyRecurrence(recurrence, to: event)
  }

  do {
    try store.save(event, span: .thisEvent, commit: true)
  } catch {
    throw BridgeFailure(message: saveFailureMessage(item: "event", error: error))
  }

  return calendar.title
}

@MainActor
@raycast
func createReminder(payloadBase64: String) async throws -> String {
  let payload: ReminderPayload = try decodePayload(payloadBase64)
  let store = EKEventStore()
  try await requestReminderAccess(store: store)

  let list = try resolveReminderList(store: store, preferredIdentifier: payload.preferredReminderCalendarIdentifier)
  let reminder = EKReminder(eventStore: store)
  reminder.title = payload.title
  reminder.calendar = list

  let dueDate = Date(timeIntervalSince1970: payload.dueEpochMs / 1000)
  let components: Set<Calendar.Component> = payload.allDay
    ? [.year, .month, .day]
    : [.year, .month, .day, .hour, .minute]
  reminder.dueDateComponents = Calendar.current.dateComponents(components, from: dueDate)

  if let notes = payload.notes?.trimmingCharacters(in: .whitespacesAndNewlines), !notes.isEmpty {
    reminder.notes = notes
  }

  do {
    try store.save(reminder, commit: true)
  } catch {
    throw BridgeFailure(message: saveFailureMessage(item: "reminder", error: error))
  }

  return list.title
}

@MainActor
private func requestEventAccess(store: EKEventStore) async throws {
  let granted: Bool
  do {
    if #available(macOS 14.0, *) {
      granted = try await store.requestFullAccessToEvents()
    } else {
      granted = try await store.requestAccess(to: .event)
    }
  } catch {
    throw BridgeFailure(message: "Calendar permission denied")
  }

  guard granted else {
    throw BridgeFailure(message: "Calendar permission denied")
  }
}

@MainActor
private func requestReminderAccess(store: EKEventStore) async throws {
  let granted: Bool
  do {
    if #available(macOS 14.0, *) {
      granted = try await store.requestFullAccessToReminders()
    } else {
      granted = try await store.requestAccess(to: .reminder)
    }
  } catch {
    throw BridgeFailure(message: "Reminders permission denied")
  }

  guard granted else {
    throw BridgeFailure(message: "Reminders permission denied")
  }
}

@MainActor
private func resolveCalendar(store: EKEventStore, preferredIdentifier: String?) throws -> EKCalendar {
  let writableCalendars = store.calendars(for: .event).filter(\.allowsContentModifications)
  guard !writableCalendars.isEmpty else {
    throw BridgeFailure(message: "No writable calendar found")
  }

  let preferredIdentifier = preferredIdentifier?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  if !preferredIdentifier.isEmpty {
    guard let match = writableCalendars.first(where: { $0.calendarIdentifier == preferredIdentifier }) else {
      throw BridgeFailure(
        message: "The selected calendar is no longer available. Refresh the calendar list and try again"
      )
    }
    return match
  }

  if let defaultCalendar = store.defaultCalendarForNewEvents, defaultCalendar.allowsContentModifications {
    return defaultCalendar
  }
  return writableCalendars[0]
}

@MainActor
private func resolveReminderList(store: EKEventStore, preferredIdentifier: String?) throws -> EKCalendar {
  let writableLists = store.calendars(for: .reminder).filter(\.allowsContentModifications)
  guard !writableLists.isEmpty else {
    throw BridgeFailure(message: "No writable reminder list found")
  }

  let preferredIdentifier = preferredIdentifier?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  if !preferredIdentifier.isEmpty {
    guard let match = writableLists.first(where: { $0.calendarIdentifier == preferredIdentifier }) else {
      throw BridgeFailure(
        message: "The selected reminder list is no longer available. Refresh the reminder list and try again"
      )
    }
    return match
  }

  if let defaultList = store.defaultCalendarForNewReminders(), defaultList.allowsContentModifications {
    return defaultList
  }
  return writableLists[0]
}

private func decodePayload<T: Decodable>(_ payloadBase64: String) throws -> T {
  guard let data = Data(base64Encoded: payloadBase64) else {
    throw BridgeFailure(message: "Payload is not valid base64")
  }

  do {
    return try JSONDecoder().decode(T.self, from: data)
  } catch {
    throw BridgeFailure(message: "Payload JSON decode failed")
  }
}

private func encodeJSON<T: Encodable>(_ value: T, failureMessage: String) throws -> String {
  do {
    let data = try JSONEncoder().encode(value)
    guard let json = String(data: data, encoding: .utf8) else {
      throw BridgeFailure(message: failureMessage)
    }
    return json
  } catch let error as BridgeFailure {
    throw error
  } catch {
    throw BridgeFailure(message: failureMessage)
  }
}

private func saveFailureMessage(item: String, error: Error) -> String {
  let nsError = error as NSError
  return "Failed to save \(item) (\(nsError.domain), code \(nsError.code))"
}

private func compareCalendars(_ lhs: EKCalendar, _ rhs: EKCalendar) -> Bool {
  if lhs.source.title == rhs.source.title {
    return lhs.title.localizedCaseInsensitiveCompare(rhs.title) == .orderedAscending
  }
  return lhs.source.title.localizedCaseInsensitiveCompare(rhs.source.title) == .orderedAscending
}

private func applyRecurrence(_ recurrence: RecurrencePayload, to event: EKEvent) throws {
  let interval = max(recurrence.interval ?? 1, 1)
  let frequency = try mapFrequency(recurrence.frequency)
  let end = try mapRecurrenceEnd(recurrence.end, startDate: event.startDate)
  var daysOfTheWeek: [EKRecurrenceDayOfWeek]?
  var daysOfTheMonth: [NSNumber]?

  if frequency == .weekly, let weekday = recurrence.weekday {
    guard let mappedWeekday = mapWeekday(weekday) else {
      throw BridgeFailure(message: "Invalid recurrence weekday")
    }
    daysOfTheWeek = [EKRecurrenceDayOfWeek(mappedWeekday)]
  }

  if frequency == .monthly, let dayOfMonth = recurrence.dayOfMonth {
    guard (1...31).contains(dayOfMonth) else {
      throw BridgeFailure(message: "Invalid recurrence day-of-month")
    }
    daysOfTheMonth = [NSNumber(value: dayOfMonth)]
  }

  event.recurrenceRules = [
    EKRecurrenceRule(
      recurrenceWith: frequency,
      interval: interval,
      daysOfTheWeek: daysOfTheWeek,
      daysOfTheMonth: daysOfTheMonth,
      monthsOfTheYear: nil,
      weeksOfTheYear: nil,
      daysOfTheYear: nil,
      setPositions: nil,
      end: end
    ),
  ]
}

private func mapFrequency(_ frequency: String) throws -> EKRecurrenceFrequency {
  switch frequency {
  case "daily": .daily
  case "weekly": .weekly
  case "monthly": .monthly
  default: throw BridgeFailure(message: "Invalid recurrence frequency")
  }
}

private func mapWeekday(_ weekday: Int) -> EKWeekday? {
  switch weekday {
  case 0: .sunday
  case 1: .monday
  case 2: .tuesday
  case 3: .wednesday
  case 4: .thursday
  case 5: .friday
  case 6: .saturday
  default: nil
  }
}

private func mapRecurrenceEnd(_ end: RecurrenceEndPayload, startDate: Date) throws -> EKRecurrenceEnd {
  switch end.type {
  case "count":
    guard let count = end.count else {
      throw BridgeFailure(message: "Missing recurrence count")
    }
    guard (1...50).contains(count) else {
      throw BridgeFailure(message: "Recurrence count must be between 1 and 50")
    }
    return EKRecurrenceEnd(occurrenceCount: count)
  case "until":
    guard let untilEpochMs = end.untilEpochMs else {
      throw BridgeFailure(message: "Missing recurrence until date")
    }
    let untilDate = Date(timeIntervalSince1970: untilEpochMs / 1000)
    guard untilDate >= startDate else {
      throw BridgeFailure(message: "Recurrence end date must be after event start")
    }
    if let maxDate = Calendar.current.date(byAdding: .year, value: 1, to: startDate), untilDate > maxDate {
      throw BridgeFailure(message: "Recurrence end date exceeds 1 year limit")
    }
    return EKRecurrenceEnd(end: untilDate)
  default:
    throw BridgeFailure(message: "Invalid recurrence end type")
  }
}
