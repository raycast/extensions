import EventKit
import Foundation
import RaycastSwiftMacros

enum CalendarError: Error {
    case accessDenied
    case noEventsFound
    case other
}

struct CalendarEvent: Codable {
    let title: String
    let notes: String
    let url: String
    let openUrl: String
    let startDate: CLongLong
    let endDate: CLongLong
    let isAllDay: Bool
    let status: String
    let color: String
    let calendarTitle: String
    let hasRecurrenceRules: Bool
}

func stringFromEventStatus(status: EKEventStatus) -> String {
    switch status {
    case .confirmed:
        return "Confirmed"
    case .tentative:
        return "Tentative"
    case .canceled:
        return "Canceled"
    @unknown default:
        return "None"
    }
}

struct KCalendar: Codable {
    let id: String
    let title: String
    let color: String
    let source: String
}


struct CalendarData: Codable {
    let calendar: KCalendar
    let events: [CalendarEvent]
}

func generateEventURL(for event: EKEvent) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyyMMdd'T'HHmmss'Z'"
    formatter.timeZone = TimeZone.current

    var dateComponent = ""
    if event.hasRecurrenceRules {
        if let startDate = event.startDate {
            formatter.dateFormat = "yyyyMMdd'T'HHmmss'Z'"
            formatter.timeZone = TimeZone.current
            if !event.isAllDay {
                formatter.timeZone = TimeZone(secondsFromGMT: 0)
            }
            dateComponent = "/\(formatter.string(from: startDate))"
        }
    }
    return "ical://ekevent\(dateComponent)/\(event.calendarItemIdentifier)?method=show&options=more"
}


@raycast func getCalendarEvents(days: Double) async throws -> [CalendarData]
{
    let eventStore = EKEventStore()

    let granted: Bool
    if #available(macOS 14.0, *) {
        granted = try await eventStore.requestFullAccessToEvents()
    } else {
        granted = try await eventStore.requestAccess(to: .event)
    }
    guard granted else {
        throw CalendarError.accessDenied
    }
    let startDate = Date().addingTimeInterval(0)
    let endDate = Date().addingTimeInterval(3600 * 24 * days)
    let calendars = eventStore.calendars(for: .event)
    let predicate = eventStore.predicateForEvents(withStart: startDate, end: endDate, calendars: calendars)

    var calendarDataList = [CalendarData]()

    for calendar in calendars {
        let predicate = eventStore.predicateForEvents(withStart: startDate, end: endDate, calendars: [calendar])
        let events = eventStore.events(matching: predicate)


        let color = calendar.cgColor?.components
        let hexColor = color != nil ? rgbaToHex(color![0], color![1], color![2]) : "#000000"
        let calendarModel = KCalendar(
            id:calendar.calendarIdentifier,title: calendar.title, color: hexColor ,source: calendar.source.title)

        let calendarEventsModel = events.map {
            CalendarEvent(
                title: $0.title ?? "New Event",
                notes: $0.notes ?? "",
                url: $0.url?.absoluteString ?? "",
                openUrl: generateEventURL(for: $0) ,
                startDate: CLongLong(round($0.startDate.timeIntervalSince1970*1000)),
                endDate: CLongLong(round($0.endDate.timeIntervalSince1970*1000)),
                isAllDay: $0.isAllDay,
                status: stringFromEventStatus(status: $0.status),
                color: hexColor,
                calendarTitle: calendar.title,
                hasRecurrenceRules: $0.hasRecurrenceRules
            )
        }
        if !calendarEventsModel.isEmpty {
            let calendarData = CalendarData(calendar: calendarModel, events: calendarEventsModel)
            calendarDataList.append(calendarData)
        }
    }

    return calendarDataList
}

@raycast func getCalendarList() async throws -> [KCalendar]
{
    let eventStore = EKEventStore()

    let granted: Bool
    if #available(macOS 14.0, *) {
        granted = try await eventStore.requestFullAccessToEvents()
    } else {
        granted = try await eventStore.requestAccess(to: .event)
    }
    guard granted else {
        throw CalendarError.accessDenied
    }

    let calendars = eventStore.calendars(for: .event)
    return calendars.map { calendar in
        let color = calendar.cgColor?.components
        let hexColor = color != nil ? rgbaToHex(color![0], color![1], color![2]) : "#000000"
        return KCalendar(
            id:calendar.calendarIdentifier,
            title: calendar.title,
            color: hexColor,
            source: calendar.source.title
        )
    }
}

