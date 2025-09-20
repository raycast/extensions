import CoreLocation
import EventKit
import Foundation
import RaycastSwiftMacros

struct Location: Codable {
    let address: String
    let proximity: String
    let radius: Double?
}

struct Reminder: Codable {
    let id: String
    let openUrl: String
    let title: String
    let url: String?
    let notes: String
    let dueDate: String?
    let isCompleted: Bool
    let priority: String
    let completionDate: String
    let isRecurring: Bool
    let recurrenceRule: String
    let list: ReminderList?
    let location: Location?
}

struct ReminderList: Codable {
    let id: String
    let title: String
    let color: String
    let isDefault: Bool
}

struct RemindersData: Codable {
    let reminders: [Reminder]
    let lists: [ReminderList]
}

enum RemindersError: Error {
    case accessDenied
    case noRemindersFound
    case noReminderFound
    case unableToSaveReminder
    case other
}


@raycast func getReminderList() async throws -> [ReminderList] {
    let eventStore = EKEventStore()

    let granted: Bool
    if #available(macOS 14.0, *) {
        granted = try await eventStore.requestFullAccessToReminders()
    } else {
        granted = try await eventStore.requestAccess(to: .reminder)
    }
    guard granted else {
        throw RemindersError.accessDenied
    }

    let calendars = eventStore.calendars(for: .reminder)
    let defaultList = eventStore.defaultCalendarForNewReminders()

    let listsData = calendars.map { $0.toStruct(defaultCalendarId: defaultList?.calendarIdentifier) }

    return listsData
}


@raycast func getData() async throws -> RemindersData {
    let eventStore = EKEventStore()

    let granted: Bool
    if #available(macOS 14.0, *) {
        granted = try await eventStore.requestFullAccessToReminders()
    } else {
        granted = try await eventStore.requestAccess(to: .reminder)
    }
    guard granted else {
        throw RemindersError.accessDenied
    }

    let predicate = eventStore.predicateForIncompleteReminders(
        withDueDateStarting: nil,
        ending: nil,
        calendars: nil
    )
    guard let reminders = await eventStore.fetchReminders(matching: predicate) else {
        throw RemindersError.noRemindersFound
    }

    let remindersData = reminders.prefix(1000).map { $0.toStruct() }

    let calendars = eventStore.calendars(for: .reminder)
    let defaultList = eventStore.defaultCalendarForNewReminders()

    let listsData = calendars.map { $0.toStruct(defaultCalendarId: defaultList?.calendarIdentifier) }

    return RemindersData(reminders: remindersData, lists: listsData)
}

@raycast func getCompletedReminders(listId: String?) async throws -> [Reminder] {
    let eventStore = EKEventStore()

    let granted: Bool
    if #available(macOS 14.0, *) {
        granted = try await eventStore.requestFullAccessToReminders()
    } else {
        granted = try await eventStore.requestAccess(to: .reminder)
    }
    guard granted else {
        throw RemindersError.accessDenied
    }

    let calendars: [EKCalendar]?
    if let listId {
        calendars = [eventStore.calendar(withIdentifier: listId)].compactMap { $0 }
    } else {
        calendars = nil
    }

    let predicate = eventStore.predicateForCompletedReminders(
        withCompletionDateStarting: nil,
        ending: nil,
        calendars: calendars
    )
    let reminders = await eventStore.fetchReminders(matching: predicate)
    guard let reminders = reminders else {
        throw RemindersError.noRemindersFound
    }

    let remindersData = reminders.prefix(1000).map { $0.toStruct() }
    return remindersData
}

struct NewReminder: Decodable {
    let title: String
    let listId: String?
    let notes: String?
    let dueDate: String?
    let priority: String?
    let recurrence: Recurrence?
    let address: String?
    let proximity: String?
    let radius: Double?
}

struct Recurrence: Decodable {
    let frequency: String
    let interval: Int
    let endDate: String?
}

@raycast func createReminder(newReminder: NewReminder) async throws -> Reminder {
    let eventStore = EKEventStore()
    let reminder = EKReminder(eventStore: eventStore)

    reminder.title = newReminder.title

    if let notes = newReminder.notes {
        reminder.notes = notes
    }

    if let listId = newReminder.listId {
        let calendars = eventStore.calendars(for: .reminder)
        guard let calendar = (calendars.first { $0.calendarIdentifier == listId }) else {
            throw RemindersError.noReminderFound
        }
        reminder.calendar = calendar
    } else {
        reminder.calendar = eventStore.defaultCalendarForNewReminders()
    }

    if let dueDateString = newReminder.dueDate {
        if dueDateString.contains("T"), let dueDate = isoDateFormatter.date(from: dueDateString) {
            reminder.dueDateComponents = Calendar.current.dateComponents(
                [.year, .month, .day, .hour, .minute, .second],
                from: dueDate
            )
            reminder.addAlarm(EKAlarm(absoluteDate: dueDate))
        } else if let dueDate = dateOnlyFormatter.date(from: dueDateString) {
            reminder.dueDateComponents = Calendar.current.dateComponents(
                [.year, .month, .day],
                from: dueDate
            )
        }
    }

    if let recurrence = newReminder.recurrence {

        var recurrenceEnd: EKRecurrenceEnd? = nil
        if let endDateString = recurrence.endDate {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            if let endDate = dateFormatter.date(from: endDateString) {
                recurrenceEnd = EKRecurrenceEnd(end: endDate)
            }
        }

        var recurrenceFrequency: EKRecurrenceFrequency
        switch recurrence.frequency {
        case "daily":
            recurrenceFrequency = .daily
        case "weekly":
            recurrenceFrequency = .weekly
        case "monthly":
            recurrenceFrequency = .monthly
        case "yearly":
            recurrenceFrequency = .yearly
        default:
            throw RemindersError.other
        }

        let recurrenceRule = EKRecurrenceRule(
            recurrenceWith: recurrenceFrequency,
            interval: recurrence.interval,
            end: recurrenceEnd
        )
        reminder.addRecurrenceRule(recurrenceRule)
    }

    if let priorityString = newReminder.priority {
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

    if let address = newReminder.address {
        do {
            let alarm = try await createLocationAlarm(
                address: address, proximity: newReminder.proximity, radius: newReminder.radius)
            reminder.addAlarm(alarm)
        } catch {
            // If the alarm cannot be created, we catch the error and continue without handling it (silent failure).
        }
    }

    do {
        try eventStore.save(reminder, commit: true)
        return reminder.toStruct()
    } catch {
        throw RemindersError.unableToSaveReminder
    }

}

struct SetTitleAndNotesPayload: Decodable {
    let reminderId: String
    let title: String?
    let notes: String?
}

@raycast func setTitleAndNotes(payload: SetTitleAndNotesPayload) throws {
    let eventStore = EKEventStore()

    guard let item = eventStore.calendarItem(withIdentifier: payload.reminderId) as? EKReminder else {
        throw RemindersError.noReminderFound
    }

    item.title = payload.title

    if let notes = payload.notes {
        item.notes = notes
    }

    try eventStore.save(item, commit: true)
}

@raycast func toggleCompletionStatus(reminderId: String) throws {
    let eventStore = EKEventStore()

    guard let item = eventStore.calendarItem(withIdentifier: reminderId) as? EKReminder else {
        throw RemindersError.noReminderFound
    }

    item.isCompleted = !item.isCompleted

    do {
        try eventStore.save(item, commit: true)
    } catch {
        throw RemindersError.unableToSaveReminder
    }
}

struct SetPriorityStatusPayload: Decodable {
    let reminderId: String
    let priority: String?
}

@raycast func setPriorityStatus(payload: SetPriorityStatusPayload) throws {
    let eventStore = EKEventStore()

    guard let item = eventStore.calendarItem(withIdentifier: payload.reminderId) as? EKReminder else {
        throw RemindersError.noReminderFound
    }

    switch payload.priority {
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
        throw RemindersError.unableToSaveReminder
    }
}

struct SetDueDatePayload: Decodable {
    let reminderId: String
    let dueDate: String?
}

@raycast func setDueDate(payload: SetDueDatePayload) throws {
    let eventStore = EKEventStore()

    guard let item = eventStore.calendarItem(withIdentifier: payload.reminderId) as? EKReminder else {
        throw RemindersError.noReminderFound
    }

    // Remove all alarms, otherwise overdue reminders won't be properly updated natively
    if let alarms = item.alarms {
        for alarm in alarms {
            item.removeAlarm(alarm)
        }
    }

    if let dueDateString = payload.dueDate {
        if dueDateString.contains("T"), let dueDate = isoDateFormatter.date(from: dueDateString) {
            item.dueDateComponents = Calendar.current.dateComponents(
                [.year, .month, .day, .hour, .minute, .second],
                from: dueDate
            )
            item.addAlarm(EKAlarm(absoluteDate: dueDate))
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
        throw RemindersError.unableToSaveReminder
    }
}

@raycast func deleteReminder(reminderId: String) throws {
    let eventStore = EKEventStore()

    guard let item = eventStore.calendarItem(withIdentifier: reminderId) as? EKReminder else {
        throw RemindersError.noReminderFound
    }

    try eventStore.remove(item, commit: true)
}

enum LocationError: Error {
    case geocodingFailed
    case invalidProximityValue
    case other(Error)
}

func createLocationAlarm(address: String, proximity: String?, radius: Double?) async throws
-> EKAlarm
{
    let geocoder = CLGeocoder()

    let geocodedPlacemarks = try await geocoder.geocodeAddressString(address)
    guard let placemark = geocodedPlacemarks.first, let location = placemark.location else {
        throw LocationError.geocodingFailed
    }

    let structuredLocation = EKStructuredLocation(title: placemark.name ?? address)
    structuredLocation.geoLocation = location

    if let radius = radius {
        structuredLocation.radius = radius
    }

    let alarm = EKAlarm()
    alarm.structuredLocation = structuredLocation

    if let proximity = proximity {
        switch proximity {
        case "enter":
            alarm.proximity = .enter
        case "leave":
            alarm.proximity = .leave
        default:
            throw LocationError.invalidProximityValue
        }
    }

    return alarm
}

struct SetLocationPayload: Decodable {
    let reminderId: String
    let address: String
    let proximity: String?
    let radius: Double?
}

@raycast func setLocation(payload: SetLocationPayload)
async throws
{
    let eventStore = EKEventStore()
    guard let reminder = eventStore.calendarItem(withIdentifier: payload.reminderId) as? EKReminder
    else {
        throw RemindersError.noReminderFound
    }

    do {
        let alarm = try await createLocationAlarm(
            address: payload.address, proximity: payload.proximity, radius: payload.radius)

        // Remove only location-based alarms otherwise the reminder in the native app won't be updated
        if let alarms = reminder.alarms {
            for alarm in alarms where alarm.isLocationAlarm {
                reminder.removeAlarm(alarm)
            }
        }

        reminder.addAlarm(alarm)
        try eventStore.save(reminder, commit: true)
    } catch {
    }
}
