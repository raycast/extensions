import Foundation
import EventKit
import RaycastExtensionMacro

#exportFunction(get)
func get() throws -> [String : Any] {
  let eventStore = EKEventStore()
  var remindersJson: [[String: Any]] = []
  var listsJson: [[String: Any]] = []
  var error: Error?

  let dispatchGroup = DispatchGroup()

  dispatchGroup.enter()

  let completion: (Bool, Error?) -> Void = { (granted, _) in
    guard granted else {
      error = "Access to reminders is not granted"
      dispatchGroup.leave()
      return
    }

    let predicate = eventStore.predicateForReminders(in: nil)
    eventStore.fetchReminders(matching: predicate) { reminders in
      guard let reminders = reminders else {
        error = "No reminders found"
        dispatchGroup.leave()
        return
      }

      remindersJson = reminders.map { $0.toDictionary() }

      let calendars = eventStore.calendars(for: .reminder)
      let defaultList = eventStore.defaultCalendarForNewReminders()

      listsJson = calendars.map {
        var dict = $0.toDictionary()
        dict["isDefault"] = $0 == defaultList
        return dict
      }

      dispatchGroup.leave()
    }
  }

  if #available(macOS 14.0, *) {
    eventStore.requestFullAccessToReminders(completion: completion)
  } else {
    eventStore.requestAccess(to: .reminder, completion: completion)
  }

  dispatchGroup.wait()

  if let error {
    throw error
  }

  return ["reminders": remindersJson, "lists": listsJson]
}

#exportFunction(create)
func create(_ values: [String: Any]) throws -> [String: Any] {
  let eventStore = EKEventStore()
  let reminder = EKReminder(eventStore: eventStore)

  if let title = values["title"] as? String {
      reminder.title = title
  } else {
      throw "Title is missing or not a string"
  }

  if let notes = values["notes"] as? String {
      reminder.notes = notes
  }

  if let listId = values["listId"] as? String {
    let calendars = eventStore.calendars(for: .reminder)
    guard let calendar = (calendars.first { $0.calendarIdentifier == listId }) else {
      throw "Calendar with id \(listId) not found"
    }
    reminder.calendar = calendar
  } else {
    reminder.calendar = eventStore.defaultCalendarForNewReminders()
  }

  if let dueDateString = values["dueDate"] as? String {
    if dueDateString.contains("T"), let dueDate = isoDateFormatter.date(from: dueDateString) {
      reminder.dueDateComponents = Calendar.current.dateComponents(
        [.year, .month, .day, .hour, .minute, .second],
        from: dueDate
      )
    } else if let dueDate = dateOnlyFormatter.date(from: dueDateString) {
      reminder.dueDateComponents = Calendar.current.dateComponents(
        [.year, .month, .day],
        from: dueDate
      )
    }
  }

  if let recurrenceDict = values["recurrence"] as? [String: Any] {
    if let frequency = recurrenceDict["frequency"] as? String,
      let interval = recurrenceDict["interval"] as? Int
    {

      var recurrenceEnd: EKRecurrenceEnd? = nil
      if let endDateString = recurrenceDict["endDate"] as? String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        if let endDate = dateFormatter.date(from: endDateString) {
          recurrenceEnd = EKRecurrenceEnd(end: endDate)
        } else {
          throw "Invalid end date format"
        }
      }

      var recurrenceFrequency: EKRecurrenceFrequency
      switch frequency {
        case "daily":
          recurrenceFrequency = .daily
        case "weekly":
          recurrenceFrequency = .weekly
        case "monthly":
          recurrenceFrequency = .monthly
        case "yearly":
          recurrenceFrequency = .yearly
        default:
          throw "Invalid recurrence frequency"
      }

      let recurrenceRule = EKRecurrenceRule(
        recurrenceWith: recurrenceFrequency,
        interval: interval,
        end: recurrenceEnd
      )
      reminder.addRecurrenceRule(recurrenceRule)
    } else {
      throw "Recurrence object missing required values"
    }
  }



  if let priorityString = values["priority"] as? String {
    switch priorityString {
    case "high":
      reminder.priority = Int(EKReminderPriority.high.rawValue)
    case "medium":
      reminder.priority = Int(EKReminderPriority.medium.rawValue)
    case "low":
      reminder.priority = Int(EKReminderPriority.low.rawValue)
    default:
      reminder.priority = Int(EKReminderPriority.none.rawValue)
    }
  }

  do {
    try eventStore.save(reminder, commit: true)

    return reminder.toDictionary()
  } catch let error {
    throw "Error creating reminder: \(error.localizedDescription)"
  }
}

#exportFunction(setTitleAndNotes)
func setTitleAndNotes(_ values: [String: String]) throws {
  let eventStore = EKEventStore()

  guard let reminderId = values["reminderId"] else {
    throw "Missing reminderId"
  }

  guard let item = eventStore.calendarItem(withIdentifier: reminderId) as? EKReminder else {
    throw "No reminder found with the provided id"
  }

  guard let title = values["title"] else {
    throw "Title is missing or not a string"
  }

  item.title = title

  if let notes = values["notes"] {
    item.notes = notes
  }

  try eventStore.save(item, commit: true)
}

#exportFunction(toggleCompletionStatus)
func toggleCompletionStatus(_ reminderId: String) throws {
  let eventStore = EKEventStore()

  guard let item = eventStore.calendarItem(withIdentifier: reminderId) as? EKReminder else {
    throw "No reminder found with the provided id"
  }

  item.isCompleted = !item.isCompleted

  do {
    try eventStore.save(item, commit: true)
  } catch {
    throw "Error completing reminder: \(error.localizedDescription)"
  }
}

#exportFunction(setPriorityStatus)
func setPriorityStatus(_ values: [String: String]) throws {
  guard let reminderId = values["reminderId"] else {
    throw "Error setting priority of reminder: missing reminderId"
  }
  guard let priority = values["priority"] else {
    throw "Error setting priority of reminder: missing priority"
  }

  let eventStore = EKEventStore()

  guard let item = eventStore.calendarItem(withIdentifier: reminderId) as? EKReminder else {
    throw "No reminder found with the provided id"
  }

  switch priority {
  case "high":
    item.priority = Int(EKReminderPriority.high.rawValue)
  case "medium":
    item.priority = Int(EKReminderPriority.medium.rawValue)
  case "low":
    item.priority = Int(EKReminderPriority.low.rawValue)
  default:
    item.priority = Int(EKReminderPriority.none.rawValue)
  }

  do {
    try eventStore.save(item, commit: true)
  } catch {
    throw "Error setting priority of reminder: \(error.localizedDescription)"
  }
}

#exportFunction(setDueDate)
func setDueDate(_ values: [String: String]) throws {
  guard let reminderId = values["reminderId"] else {
    throw "Error setting due date of reminder: missing reminderId"
  }

  let eventStore = EKEventStore()

  guard let item = eventStore.calendarItem(withIdentifier: reminderId) as? EKReminder else {
    throw "No reminder found with the provided id"
  }

  if let dueDateString = values["dueDate"] {
    if dueDateString.contains("T"), let dueDate = isoDateFormatter.date(from: dueDateString) {
      item.dueDateComponents = Calendar.current.dateComponents(
        [.year, .month, .day, .hour, .minute, .second],
        from: dueDate
      )
    } else if let dueDate = dateOnlyFormatter.date(from: dueDateString) {
      item.dueDateComponents = Calendar.current.dateComponents(
        [.year, .month, .day],
        from: dueDate
      )
    }
  } else {
    item.dueDateComponents = nil
  }

  do {
    try eventStore.save(item, commit: true)
  } catch {
    throw "Error setting due date of reminder: \(error.localizedDescription)"
  }
}

#exportFunction(deleteReminder)
func deleteReminder(_ reminderId: String) throws {
  let eventStore = EKEventStore()

  guard let item = eventStore.calendarItem(withIdentifier: reminderId) as? EKReminder else {
    throw "No reminder found with the provided id"
  }

  do {
    try eventStore.remove(item, commit: true)
  } catch {
    throw "Error deleting reminder: \(error.localizedDescription)"
  }
}

#handleFunctionCall()
