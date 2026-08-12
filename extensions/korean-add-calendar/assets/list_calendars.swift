import EventKit
import Foundation

struct CalendarItem: Encodable {
  let id: String
  let title: String
  let sourceTitle: String
}

struct ListOutput: Encodable {
  let defaultCalendarIdentifier: String?
  let calendars: [CalendarItem]
}

enum ScriptFailure: Error {
  case message(String)
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

func listWritableCalendars() throws -> ListOutput {
  let store = EKEventStore()
  try requestEventAccess(store: store)

  let writableCalendars = store.calendars(for: .event)
    .filter { $0.allowsContentModifications }
    .sorted { lhs, rhs in
      if lhs.source.title == rhs.source.title {
        return lhs.title.localizedCaseInsensitiveCompare(rhs.title) == .orderedAscending
      }
      return lhs.source.title.localizedCaseInsensitiveCompare(rhs.source.title) == .orderedAscending
    }

  let defaultCalendar = store.defaultCalendarForNewEvents
  let defaultCalendarIdentifier = defaultCalendar?.allowsContentModifications == true
    ? defaultCalendar?.calendarIdentifier
    : nil

  let calendars = writableCalendars.map { calendar in
    CalendarItem(
      id: calendar.calendarIdentifier,
      title: calendar.title,
      sourceTitle: calendar.source.title
    )
  }

  return ListOutput(defaultCalendarIdentifier: defaultCalendarIdentifier, calendars: calendars)
}

func main() throws {
  let output = try listWritableCalendars()
  let encoder = JSONEncoder()
  let data = try encoder.encode(output)

  guard let json = String(data: data, encoding: .utf8) else {
    throw ScriptFailure.message("Failed to encode calendar list")
  }

  print(json)
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
