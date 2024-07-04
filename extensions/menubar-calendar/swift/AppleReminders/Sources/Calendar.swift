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
    let openUrl: String
    let startDate: CLongLong
    let endDate: CLongLong
    let isAllDay: Bool
    let status: String
    let color: String
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
    let title: String
    let color: String
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
    let granted = try await eventStore.requestAccess(to: .event)
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
        let calendarModel = KCalendar(title: calendar.title, color: hexColor)
        
        let calendarEventsModel = events.map {
            CalendarEvent(
                title: $0.title ?? "New Event",
                openUrl: generateEventURL(for: $0) ,
                startDate: CLongLong(round($0.startDate.timeIntervalSince1970*1000)),
                endDate: CLongLong(round($0.endDate.timeIntervalSince1970*1000)),
                isAllDay: $0.isAllDay,
                status: stringFromEventStatus(status: $0.status),
                color: hexColor
            )
        }
        if !calendarEventsModel.isEmpty {
            let calendarData = CalendarData(calendar: calendarModel, events: calendarEventsModel)
            calendarDataList.append(calendarData)
        }
    }
    
    return calendarDataList
}
