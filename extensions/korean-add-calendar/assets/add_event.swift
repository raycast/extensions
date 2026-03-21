import EventKit
import Foundation

struct Payload: Decodable {
  let title: String
  let startEpochMs: Double
  let endEpochMs: Double
  let location: String?
  let allDay: Bool
  let preferredCalendarIdentifier: String?
  let recurrence: RecurrencePayload?
}

struct RecurrencePayload: Decodable {
  let frequency: String
  let interval: Int?
  let weekday: Int?
  let dayOfMonth: Int?
  let end: RecurrenceEndPayload
}

struct RecurrenceEndPayload: Decodable {
  let type: String
  let count: Int?
  let untilEpochMs: Double?
}

enum ScriptFailure: Error {
  case message(String)
}

func decodePayload(fromBase64 argument: String?) throws -> Payload {
  guard let argument else {
    throw ScriptFailure.message("Missing payload argument")
  }

  guard let data = Data(base64Encoded: argument) else {
    throw ScriptFailure.message("Payload is not valid base64")
  }

  do {
    return try JSONDecoder().decode(Payload.self, from: data)
  } catch {
    throw ScriptFailure.message("Payload JSON decode failed: \(error.localizedDescription)")
  }
}

func requestEventAccess(store: EKEventStore) throws {
  let semaphore = DispatchSemaphore(value: 0)
  var granted = false
  var requestError: Error?

  if #available(macOS 14.0, *) {
    store.requestFullAccessToEvents { result, error in
      granted = result
      requestError = error
      semaphore.signal()
    }
  } else {
    store.requestAccess(to: .event) { result, error in
      granted = result
      requestError = error
      semaphore.signal()
    }
  }

  if semaphore.wait(timeout: .now() + .seconds(15)) == .timedOut {
    throw ScriptFailure.message("Timed out while waiting for calendar permission")
  }

  if let requestError {
    throw ScriptFailure.message(requestError.localizedDescription)
  }

  if !granted {
    throw ScriptFailure.message("Calendar permission denied")
  }
}

func resolveCalendar(store: EKEventStore, preferredIdentifier: String?) throws -> EKCalendar {
  let writableCalendars = store.calendars(for: .event).filter { $0.allowsContentModifications }

  guard !writableCalendars.isEmpty else {
    throw ScriptFailure.message("No writable calendar found")
  }

  let trimmedIdentifier = preferredIdentifier?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  if !trimmedIdentifier.isEmpty,
     let matched = writableCalendars.first(where: { $0.calendarIdentifier == trimmedIdentifier })
  {
    return matched
  }

  if let defaultCalendar = store.defaultCalendarForNewEvents,
     defaultCalendar.allowsContentModifications
  {
    return defaultCalendar
  }

  return writableCalendars[0]
}

func saveEvent(payload: Payload) throws -> String {
  let store = EKEventStore()
  try requestEventAccess(store: store)

  let calendar = try resolveCalendar(store: store, preferredIdentifier: payload.preferredCalendarIdentifier)
  let event = EKEvent(eventStore: store)

  event.title = payload.title
  event.startDate = Date(timeIntervalSince1970: payload.startEpochMs / 1000)
  event.endDate = Date(timeIntervalSince1970: payload.endEpochMs / 1000)
  event.isAllDay = payload.allDay

  if let location = payload.location?.trimmingCharacters(in: .whitespacesAndNewlines), !location.isEmpty {
    event.location = location
  }

  event.calendar = calendar
  if let recurrence = payload.recurrence {
    try applyRecurrence(recurrence, to: event)
  }

  do {
    try store.save(event, span: .thisEvent, commit: true)
  } catch {
    throw ScriptFailure.message("Failed to save event: \(error.localizedDescription)")
  }

  return calendar.title
}

func applyRecurrence(_ recurrence: RecurrencePayload, to event: EKEvent) throws {
  let interval = max(recurrence.interval ?? 1, 1)
  let frequency = try mapFrequency(recurrence.frequency)
  let end = try mapRecurrenceEnd(recurrence.end, startDate: event.startDate)

  var daysOfTheWeek: [EKRecurrenceDayOfWeek]?
  var daysOfTheMonth: [NSNumber]?

  if frequency == .weekly, let weekday = recurrence.weekday {
    guard let mappedWeekday = mapWeekday(weekday) else {
      throw ScriptFailure.message("Invalid recurrence weekday")
    }
    daysOfTheWeek = [EKRecurrenceDayOfWeek(mappedWeekday)]
  }

  if frequency == .monthly, let dayOfMonth = recurrence.dayOfMonth {
    guard (1...31).contains(dayOfMonth) else {
      throw ScriptFailure.message("Invalid recurrence day-of-month")
    }
    daysOfTheMonth = [NSNumber(value: dayOfMonth)]
  }

  let rule = EKRecurrenceRule(
    recurrenceWith: frequency,
    interval: interval,
    daysOfTheWeek: daysOfTheWeek,
    daysOfTheMonth: daysOfTheMonth,
    monthsOfTheYear: nil,
    weeksOfTheYear: nil,
    daysOfTheYear: nil,
    setPositions: nil,
    end: end
  )
  event.recurrenceRules = [rule]
}

func mapFrequency(_ frequency: String) throws -> EKRecurrenceFrequency {
  switch frequency {
  case "daily":
    return .daily
  case "weekly":
    return .weekly
  case "monthly":
    return .monthly
  default:
    throw ScriptFailure.message("Invalid recurrence frequency")
  }
}

func mapWeekday(_ weekday: Int) -> EKWeekday? {
  switch weekday {
  case 0:
    return .sunday
  case 1:
    return .monday
  case 2:
    return .tuesday
  case 3:
    return .wednesday
  case 4:
    return .thursday
  case 5:
    return .friday
  case 6:
    return .saturday
  default:
    return nil
  }
}

func mapRecurrenceEnd(_ end: RecurrenceEndPayload, startDate: Date) throws -> EKRecurrenceEnd {
  switch end.type {
  case "count":
    guard let count = end.count else {
      throw ScriptFailure.message("Missing recurrence count")
    }
    guard (1...50).contains(count) else {
      throw ScriptFailure.message("Recurrence count must be between 1 and 50")
    }
    return EKRecurrenceEnd(occurrenceCount: count)
  case "until":
    guard let untilEpochMs = end.untilEpochMs else {
      throw ScriptFailure.message("Missing recurrence until date")
    }
    let untilDate = Date(timeIntervalSince1970: untilEpochMs / 1000)
    guard untilDate >= startDate else {
      throw ScriptFailure.message("Recurrence end date must be after event start")
    }
    if let maxDate = Calendar.current.date(byAdding: .year, value: 1, to: startDate), untilDate > maxDate {
      throw ScriptFailure.message("Recurrence end date exceeds 1 year limit")
    }
    return EKRecurrenceEnd(end: untilDate)
  default:
    throw ScriptFailure.message("Invalid recurrence end type")
  }
}

func main() throws {
  let payload = try decodePayload(fromBase64: CommandLine.arguments.dropFirst().first)
  let calendarTitle = try saveEvent(payload: payload)
  print(calendarTitle)
}

do {
  try main()
} catch ScriptFailure.message(let message) {
  fputs("ERROR: \(message)\n", stderr)
  exit(1)
} catch {
  fputs("ERROR: \(error.localizedDescription)\n", stderr)
  exit(1)
}
