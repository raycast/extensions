import EventKit
import Foundation

let reminderResultLimit = 1000

func calendarsForReminderQuery(listId: String?, calendars: [EKCalendar]) throws -> [EKCalendar]? {
  guard let listId, !["all", "today", "overdue", "scheduled"].contains(listId) else {
    return nil
  }
  guard let calendar = calendars.first(where: { $0.calendarIdentifier == listId }) else {
    throw RemindersError.noListFound
  }
  return [calendar]
}

// Filter before serializing and limiting results so unrelated reminders cannot
// crowd a selected list or search out of the response. Keep one extra to detect truncation.
func remindersMatchingQuery(
  _ reminders: [EKReminder], listId: String?, searchText: String?, now: Date = Date()
) -> [EKReminder] {
  let calendar = Calendar.current
  let today = calendar.startOfDay(for: now)
  let tomorrow = calendar.date(byAdding: .day, value: 1, to: today)!
  let terms = (searchText ?? "").split(whereSeparator: { $0.isWhitespace }).map(String.init)
  let dateFormatter = DateFormatter()
  // ReminderListItem uses date-fns' default English month names and Gregorian dates.
  dateFormatter.locale = Locale(identifier: "en_US_POSIX")
  dateFormatter.calendar = Calendar(identifier: .gregorian)
  dateFormatter.dateFormat = "dd MMMM"

  return Array(reminders.lazy.filter { reminder in
    let dueDate = reminder.dueDateComponents.flatMap { calendar.date(from: $0) }
    let hasTime = reminder.dueDateComponents?.hour != nil && reminder.dueDateComponents?.minute != nil

    switch listId {
    case nil, "all": break
    case "today":
      guard let dueDate, dueDate < tomorrow else { return false }
    case "overdue":
      guard let dueDate, dueDate < (hasTime ? now : today) else { return false }
    case "scheduled":
      guard dueDate != nil else { return false }
    default:
      guard reminder.calendar?.calendarIdentifier == listId else { return false }
    }

    guard !terms.isEmpty else { return true }

    var fields = [reminder.title ?? "", reminder.notes ?? ""]
    if listId == nil || listId == "all" {
      fields.append(reminder.calendar?.title ?? "")
    }
    fields.append((EKReminderPriority(rawValue: UInt(reminder.priority)) ?? .none).displayString)
    if let dueDate { fields.append(dateFormatter.string(from: dueDate)) }
    if let completionDate = reminder.completionDate {
      fields.append(dateFormatter.string(from: completionDate))
    }
    fields.append(contentsOf: (reminder.alarms ?? []).compactMap { $0.structuredLocation?.title })

    return terms.allSatisfy { term in
      fields.contains { $0.localizedStandardContains(term) }
    }
  }.prefix(reminderResultLimit + 1))
}
