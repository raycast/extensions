import EventKit
import Foundation

struct Payload: Decodable {
  let title: String
  let dueEpochMs: Double
  let allDay: Bool
  let notes: String?
  let preferredReminderCalendarIdentifier: String?
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

func requestReminderAccess(store: EKEventStore) throws {
  let semaphore = DispatchSemaphore(value: 0)
  var granted = false
  var requestError: Error?

  if #available(macOS 14.0, *) {
    store.requestFullAccessToReminders { result, error in
      granted = result
      requestError = error
      semaphore.signal()
    }
  } else {
    store.requestAccess(to: .reminder) { result, error in
      granted = result
      requestError = error
      semaphore.signal()
    }
  }

  if semaphore.wait(timeout: .now() + .seconds(15)) == .timedOut {
    throw ScriptFailure.message("Timed out while waiting for reminders permission")
  }

  if let requestError {
    throw ScriptFailure.message(requestError.localizedDescription)
  }

  if !granted {
    throw ScriptFailure.message("Reminders permission denied")
  }
}

func resolveReminderCalendar(store: EKEventStore, preferredIdentifier: String?) throws -> EKCalendar {
  let writableReminderCalendars = store.calendars(for: .reminder).filter { $0.allowsContentModifications }

  guard !writableReminderCalendars.isEmpty else {
    throw ScriptFailure.message("No writable reminder list found")
  }

  let trimmedIdentifier = preferredIdentifier?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  if !trimmedIdentifier.isEmpty,
     let matched = writableReminderCalendars.first(where: { $0.calendarIdentifier == trimmedIdentifier })
  {
    return matched
  }

  if let defaultReminderCalendar = store.defaultCalendarForNewReminders(),
     defaultReminderCalendar.allowsContentModifications
  {
    return defaultReminderCalendar
  }

  return writableReminderCalendars[0]
}

func saveReminder(payload: Payload) throws -> String {
  let store = EKEventStore()
  try requestReminderAccess(store: store)

  let reminderCalendar = try resolveReminderCalendar(store: store, preferredIdentifier: payload.preferredReminderCalendarIdentifier)
  let reminder = EKReminder(eventStore: store)

  reminder.title = payload.title
  reminder.calendar = reminderCalendar

  let dueDate = Date(timeIntervalSince1970: payload.dueEpochMs / 1000)
  if payload.allDay {
    reminder.dueDateComponents = Calendar.current.dateComponents([.year, .month, .day], from: dueDate)
  } else {
    reminder.dueDateComponents = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: dueDate)
  }

  if let notes = payload.notes?.trimmingCharacters(in: .whitespacesAndNewlines), !notes.isEmpty {
    reminder.notes = notes
  }

  do {
    try store.save(reminder, commit: true)
  } catch {
    throw ScriptFailure.message("Failed to save reminder: \(error.localizedDescription)")
  }

  return reminderCalendar.title
}

func main() throws {
  let payload = try decodePayload(fromBase64: CommandLine.arguments.dropFirst().first)
  let reminderListTitle = try saveReminder(payload: payload)
  print(reminderListTitle)
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
