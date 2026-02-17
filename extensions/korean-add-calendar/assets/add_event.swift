import EventKit
import Foundation

struct Payload: Decodable {
  let title: String
  let startEpochMs: Double
  let endEpochMs: Double
  let location: String?
  let allDay: Bool
  let preferredCalendarIdentifier: String?
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

  do {
    try store.save(event, span: .thisEvent, commit: true)
  } catch {
    throw ScriptFailure.message("Failed to save event: \(error.localizedDescription)")
  }

  return calendar.title
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
