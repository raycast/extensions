import EventKit
import Foundation

struct ReminderListItem: Encodable {
  let id: String
  let title: String
  let sourceTitle: String
}

struct ListOutput: Encodable {
  let defaultReminderListIdentifier: String?
  let reminderLists: [ReminderListItem]
}

enum ScriptFailure: Error {
  case message(String)
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

func listWritableReminderLists() throws -> ListOutput {
  let store = EKEventStore()
  try requestReminderAccess(store: store)

  let writableReminderLists = store.calendars(for: .reminder)
    .filter { $0.allowsContentModifications }
    .sorted { lhs, rhs in
      if lhs.source.title == rhs.source.title {
        return lhs.title.localizedCaseInsensitiveCompare(rhs.title) == .orderedAscending
      }
      return lhs.source.title.localizedCaseInsensitiveCompare(rhs.source.title) == .orderedAscending
    }

  let defaultReminderList = store.defaultCalendarForNewReminders()
  let defaultReminderListIdentifier = defaultReminderList?.allowsContentModifications == true
    ? defaultReminderList?.calendarIdentifier
    : nil

  let reminderLists = writableReminderLists.map { reminderList in
    ReminderListItem(
      id: reminderList.calendarIdentifier,
      title: reminderList.title,
      sourceTitle: reminderList.source.title
    )
  }

  return ListOutput(defaultReminderListIdentifier: defaultReminderListIdentifier, reminderLists: reminderLists)
}

func main() throws {
  let output = try listWritableReminderLists()
  let encoder = JSONEncoder()
  let data = try encoder.encode(output)

  guard let json = String(data: data, encoding: .utf8) else {
    throw ScriptFailure.message("Failed to encode reminder list output")
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
