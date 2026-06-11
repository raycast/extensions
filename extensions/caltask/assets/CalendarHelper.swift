#!/usr/bin/env swift

import EventKit
import Foundation

// Parse command line arguments
// Usage:
//   CalendarHelper list
//     - List all calendars with colors
//   CalendarHelper update <eventId> <startTs> <endTs> [notes]
//     - Update an existing event
//   CalendarHelper create <jsonPayload>
//     - Create a new event
//   CalendarHelper delete <eventId> <span> [occurrenceStartTs]
//     - Delete an event
//   CalendarHelper update-full <eventId> <json> [span] [occStartTs]
//     - Full update an event
//   CalendarHelper search <query> <startTs> <endTs> [calIds...]
//     - Search events by title
//   CalendarHelper <startTs> <endTs> <id1> [id2] ...
//     - Get events by calendar ids
let args = CommandLine.arguments

// Helper function to convert EKSourceType to a readable string
func sourceTypeString(_ type: EKSourceType) -> String {
    switch type {
    case .local: return "Local"
    case .exchange: return "Exchange"
    case .calDAV: return "CalDAV"
    case .mobileMe: return "MobileMe"
    case .subscribed: return "Subscribed"
    case .birthdays: return "Birthdays"
    @unknown default: return "Unknown"
    }
}

// Helper function to get calendar color as hex string
func getCalendarColorHex(_ calendar: EKCalendar) -> String {
    guard let cgColor = calendar.cgColor else { return "#808080" }
    
    // Convert to sRGB color space for consistent colors
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
          let convertedColor = cgColor.converted(to: colorSpace, intent: .defaultIntent, options: nil),
          let components = convertedColor.components,
          components.count >= 3 else {
        // Fallback: use original components
        let components = cgColor.components ?? [0.5, 0.5, 0.5, 1.0]
        let r = Int((components[0]) * 255)
        let g = Int((components.count > 1 ? components[1] : components[0]) * 255)
        let b = Int((components.count > 2 ? components[2] : components[0]) * 255)
        return String(format: "#%02X%02X%02X", r, g, b)
    }
    
    let r = Int(components[0] * 255)
    let g = Int(components[1] * 255)
    let b = Int(components[2] * 255)
    return String(format: "#%02X%02X%02X", r, g, b)
}

// Check if this is a "list" command
if args.count == 2 && args[1] == "list" {
    let store = EKEventStore()
    let semaphore = DispatchSemaphore(value: 0)
    
    store.requestFullAccessToEvents { granted, error in
        defer { semaphore.signal() }
        
        if let error = error {
            fputs("Calendar access error: \(error.localizedDescription)\n", stderr)
        }
        
        guard granted else {
            print("[]")
            return
        }
        
        let calendars = store.calendars(for: .event)
        var results: [[String: String]] = []
        
        for cal in calendars {
            // Skip system calendars
            if cal.title == "Siri Suggestions" || cal.title == "Scheduled Reminders" {
                continue
            }
            results.append([
                "id": cal.calendarIdentifier,
                "name": cal.title,
                "color": getCalendarColorHex(cal),
                "accountName": cal.source.title,
                "accountType": sourceTypeString(cal.source.sourceType)
            ])
        }
        
        // Remove duplicates by id (keep first occurrence)
        var seen = Set<String>()
        results = results.filter { item in
            let id = item["id"] ?? ""
            if seen.contains(id) { return false }
            seen.insert(id)
            return true
        }
        
        if let jsonData = try? JSONSerialization.data(withJSONObject: results),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            print(jsonString)
        } else {
            print("[]")
        }
    }
    
    semaphore.wait()
    exit(0)
}

// Update event mode
// Usage: CalendarHelper update <eventId> <startTimestamp> <endTimestamp> [notes]
if args.count >= 2 && args[1] == "update" {
    guard args.count >= 5 else {
        fputs("Usage: CalendarHelper update <eventId> <startTs> <endTs> [notes]\n", stderr)
        exit(1)
    }
    let eventId = args[2]
    guard let startTs = Double(args[3]),
          let endTs = Double(args[4]) else {
        fputs("Invalid timestamps\n", stderr)
        exit(1)
    }
    let newNotes = args.count >= 6 ? args[5] : nil
    let newStart = Date(timeIntervalSince1970: startTs)
    let newEnd = Date(timeIntervalSince1970: endTs)

    let store = EKEventStore()
    let semaphore = DispatchSemaphore(value: 0)

    store.requestFullAccessToEvents { granted, error in
        defer { semaphore.signal() }

        if let error = error {
            fputs("Calendar access error: \(error.localizedDescription)\n", stderr)
            exit(1)
        }

        guard granted else {
            fputs("Calendar access not granted\n", stderr)
            exit(1)
        }

        guard let event = store.event(withIdentifier: eventId) else {
            fputs("Event not found: \(eventId)\n", stderr)
            exit(1)
        }

        event.startDate = newStart
        event.endDate = newEnd
        if let newNotes = newNotes {
            event.notes = newNotes
        }

        do {
            try store.save(event, span: .thisEvent)
            print("ok")
        } catch {
            fputs("Failed to save event: \(error.localizedDescription)\n", stderr)
            exit(1)
        }
    }

    semaphore.wait()
    exit(0)
}

// Create event mode
// Usage: CalendarHelper create <jsonPayload>
// JSON fields: title, calendarId, startTs, endTs, isAllDay, notes, url,
//              location, recurrenceRule, recurrenceEndTs, alarmOffsets
if args.count >= 2 && args[1] == "create" {
    guard args.count >= 3 else {
        fputs("Usage: CalendarHelper create <jsonPayload>\n", stderr)
        exit(1)
    }

    guard let jsonData = args[2].data(using: .utf8),
          let payload = try? JSONSerialization.jsonObject(
              with: jsonData) as? [String: Any] else {
        fputs("Invalid JSON payload\n", stderr)
        exit(1)
    }

    guard let title = payload["title"] as? String,
          let calendarId = payload["calendarId"] as? String,
          let startTs = payload["startTs"] as? Double,
          let endTs = payload["endTs"] as? Double else {
        fputs("Missing required fields: title, calendarId, startTs, endTs\n",
              stderr)
        exit(1)
    }

    let store = EKEventStore()
    let semaphore = DispatchSemaphore(value: 0)

    store.requestFullAccessToEvents { granted, error in
        defer { semaphore.signal() }

        if let error = error {
            fputs("Calendar access error: \(error.localizedDescription)\n",
                  stderr)
            exit(1)
        }

        guard granted else {
            fputs("Calendar access not granted\n", stderr)
            exit(1)
        }

        guard let calendar = store.calendar(
            withIdentifier: calendarId) else {
            fputs("Calendar not found: \(calendarId)\n", stderr)
            exit(1)
        }

        let event = EKEvent(eventStore: store)
        event.title = title
        event.calendar = calendar
        event.startDate = Date(timeIntervalSince1970: startTs)
        event.endDate = Date(timeIntervalSince1970: endTs)
        event.isAllDay = (payload["isAllDay"] as? Bool) ?? false

        if let notes = payload["notes"] as? String {
            event.notes = notes
        }
        if let urlStr = payload["url"] as? String,
           let url = URL(string: urlStr) {
            event.url = url
        }
        if let location = payload["location"] as? String {
            event.location = location
        }

        // Recurrence rule
        if let ruleStr = payload["recurrenceRule"] as? String,
           ruleStr != "none" {
            var freq: EKRecurrenceFrequency?
            switch ruleStr {
            case "daily": freq = .daily
            case "weekly": freq = .weekly
            case "monthly": freq = .monthly
            case "yearly": freq = .yearly
            default: break
            }
            if let freq = freq {
                var end: EKRecurrenceEnd?
                if let endTs = payload["recurrenceEndTs"] as? Double {
                    end = EKRecurrenceEnd(
                        end: Date(timeIntervalSince1970: endTs))
                }
                let rule = EKRecurrenceRule(
                    recurrenceWith: freq,
                    interval: 1,
                    end: end
                )
                event.addRecurrenceRule(rule)
            }
        }

        // Alarms
        if let offsets = payload["alarmOffsets"] as? [Double] {
            for offset in offsets {
                event.addAlarm(EKAlarm(relativeOffset: offset))
            }
        }

        do {
            try store.save(event, span: .thisEvent)
            // Return the event ID as JSON
            let result: [String: String] = [
                "eventId": event.eventIdentifier ?? ""
            ]
            if let data = try? JSONSerialization.data(
                withJSONObject: result),
               let str = String(data: data, encoding: .utf8) {
                print(str)
            }
        } catch {
            fputs("Failed to save event: \(error.localizedDescription)\n",
                  stderr)
            exit(1)
        }
    }

    semaphore.wait()
    exit(0)
}

// Delete event mode
// Usage: CalendarHelper delete <eventId> <span> [occurrenceStartTs]
// span: "this" | "future" | "all"
if args.count >= 2 && args[1] == "delete" {
    guard args.count >= 4 else {
        fputs(
            "Usage: CalendarHelper delete <eventId> <span>"
                + " [occurrenceStartTs]\n",
            stderr)
        exit(1)
    }
    let eventId = args[2]
    let spanArg = args[3]
    let occurrenceTs: Double? = args.count >= 5
        ? Double(args[4])
        : nil

    let span: EKSpan
    switch spanArg {
    case "this": span = .thisEvent
    case "future", "all": span = .futureEvents
    default:
        fputs(
            "Invalid span: \(spanArg)."
                + " Use 'this', 'future', or 'all'\n",
            stderr)
        exit(1)
    }

    let store = EKEventStore()
    let semaphore = DispatchSemaphore(value: 0)

    store.requestFullAccessToEvents { granted, error in
        defer { semaphore.signal() }

        if let error = error {
            fputs(
                "Calendar access error:"
                    + " \(error.localizedDescription)\n",
                stderr)
            exit(1)
        }

        guard granted else {
            fputs("Calendar access not granted\n", stderr)
            exit(1)
        }

        // Find the correct event/occurrence
        var targetEvent: EKEvent?

        if let ts = occurrenceTs {
            // Use occurrence date to find the specific
            // instance instead of the master event
            let occurrenceDate = Date(
                timeIntervalSince1970: ts)
            let searchStart =
                occurrenceDate.addingTimeInterval(-1)
            let searchEnd =
                occurrenceDate.addingTimeInterval(
                    24 * 60 * 60)
            let predicate = store.predicateForEvents(
                withStart: searchStart,
                end: searchEnd,
                calendars: nil)
            let events = store.events(matching: predicate)
            targetEvent = events.first { ev in
                ev.eventIdentifier == eventId
                    && abs(
                        ev.startDate
                            .timeIntervalSince(
                                occurrenceDate)) < 2
            }
        }

        // Fallback to master event lookup
        if targetEvent == nil {
            targetEvent = store.event(
                withIdentifier: eventId)
        }

        guard let event = targetEvent else {
            fputs("Event not found: \(eventId)\n", stderr)
            exit(1)
        }

        do {
            try store.remove(event, span: span)
            print("ok")
        } catch {
            fputs(
                "Failed to delete event:"
                    + " \(error.localizedDescription)\n",
                stderr)
            exit(1)
        }
    }

    semaphore.wait()
    exit(0)
}

// Full update event mode
// Usage: CalendarHelper update-full <eventId> <jsonPayload>
//        [span] [occurrenceStartTs]
// JSON fields: title, calendarId, startTs, endTs, isAllDay, notes,
//              url, location, recurrenceRule, recurrenceEndTs,
//              alarmOffsets
// span: "this" (default) | "all"
if args.count >= 2 && args[1] == "update-full" {
    guard args.count >= 4 else {
        fputs(
            "Usage: CalendarHelper update-full <eventId>"
                + " <json> [span] [occurrenceStartTs]\n",
            stderr)
        exit(1)
    }
    let eventId = args[2]

    guard let jsonData = args[3].data(using: .utf8),
          let payload = try? JSONSerialization.jsonObject(
              with: jsonData) as? [String: Any] else {
        fputs("Invalid JSON payload\n", stderr)
        exit(1)
    }

    let spanArg = args.count >= 5 ? args[4] : "this"
    let span: EKSpan = spanArg == "all"
        ? .futureEvents : .thisEvent
    let occurrenceTs: Double? = args.count >= 6
        ? Double(args[5])
        : nil

    let store = EKEventStore()
    let semaphore = DispatchSemaphore(value: 0)

    store.requestFullAccessToEvents { granted, error in
        defer { semaphore.signal() }

        if let error = error {
            fputs(
                "Calendar access error:"
                    + " \(error.localizedDescription)\n",
                stderr)
            exit(1)
        }

        guard granted else {
            fputs("Calendar access not granted\n", stderr)
            exit(1)
        }

        // Find the correct event/occurrence
        var targetEvent: EKEvent?

        if let ts = occurrenceTs {
            // Use occurrence date to find the specific
            // instance instead of the master event
            let occurrenceDate = Date(
                timeIntervalSince1970: ts)
            let searchStart =
                occurrenceDate.addingTimeInterval(-1)
            let searchEnd =
                occurrenceDate.addingTimeInterval(
                    24 * 60 * 60)
            let predicate = store.predicateForEvents(
                withStart: searchStart,
                end: searchEnd,
                calendars: nil)
            let events = store.events(matching: predicate)
            targetEvent = events.first { ev in
                ev.eventIdentifier == eventId
                    && abs(
                        ev.startDate
                            .timeIntervalSince(
                                occurrenceDate)) < 2
            }
        }

        // Fallback to master event lookup
        if targetEvent == nil {
            targetEvent = store.event(
                withIdentifier: eventId)
        }

        guard let event = targetEvent else {
            fputs("Event not found: \(eventId)\n", stderr)
            exit(1)
        }

        // Update fields from payload
        if let title = payload["title"] as? String {
            event.title = title
        }
        if let calendarId = payload["calendarId"] as? String,
           let calendar = store.calendar(withIdentifier: calendarId) {
            event.calendar = calendar
        }
        if let startTs = payload["startTs"] as? Double {
            event.startDate = Date(timeIntervalSince1970: startTs)
        }
        if let endTs = payload["endTs"] as? Double {
            event.endDate = Date(timeIntervalSince1970: endTs)
        }
        if let isAllDay = payload["isAllDay"] as? Bool {
            event.isAllDay = isAllDay
        }
        if let notes = payload["notes"] as? String {
            event.notes = notes
        }
        if let urlStr = payload["url"] as? String {
            event.url = urlStr.isEmpty ? nil : URL(string: urlStr)
        }
        if let location = payload["location"] as? String {
            event.location = location
        }

        // Update recurrence (only when editing "all")
        if span == .futureEvents,
           let ruleStr = payload["recurrenceRule"] as? String {
            // Remove existing rules
            if let rules = event.recurrenceRules {
                for rule in rules {
                    event.removeRecurrenceRule(rule)
                }
            }
            if ruleStr != "none" {
                var freq: EKRecurrenceFrequency?
                switch ruleStr {
                case "daily": freq = .daily
                case "weekly": freq = .weekly
                case "monthly": freq = .monthly
                case "yearly": freq = .yearly
                default: break
                }
                if let freq = freq {
                    var end: EKRecurrenceEnd?
                    if let endTs = payload["recurrenceEndTs"] as? Double {
                        end = EKRecurrenceEnd(
                            end: Date(timeIntervalSince1970: endTs))
                    }
                    let rule = EKRecurrenceRule(
                        recurrenceWith: freq, interval: 1, end: end)
                    event.addRecurrenceRule(rule)
                }
            }
        }

        // Update alarms
        if let offsets = payload["alarmOffsets"] as? [Double] {
            // Remove existing alarms
            if let alarms = event.alarms {
                for alarm in alarms {
                    event.removeAlarm(alarm)
                }
            }
            for offset in offsets {
                event.addAlarm(EKAlarm(relativeOffset: offset))
            }
        }

        do {
            try store.save(event, span: span)
            print("ok")
        } catch {
            fputs("Failed to save event: \(error.localizedDescription)\n",
                  stderr)
            exit(1)
        }
    }

    semaphore.wait()
    exit(0)
}

// Search events mode
// Usage: CalendarHelper search <query> <startTs> <endTs> [calId1] [calId2] ...
if args.count >= 2 && args[1] == "search" {
    guard args.count >= 5 else {
        fputs(
            "Usage: CalendarHelper search <query> <startTs> <endTs> [calIds...]\n",
            stderr)
        exit(1)
    }
    let query = args[2].lowercased()
    guard let startTs = Double(args[3]),
          let endTs = Double(args[4]) else {
        fputs("Invalid timestamps\n", stderr)
        exit(1)
    }
    let calendarIds: Set<String>? = args.count > 5
        ? Set(args[5...])
        : nil

    let store = EKEventStore()
    let semaphore = DispatchSemaphore(value: 0)

    store.requestFullAccessToEvents { granted, error in
        defer { semaphore.signal() }

        if let error = error {
            fputs("Calendar access error: \(error.localizedDescription)\n",
                  stderr)
            exit(1)
        }

        guard granted else {
            print("[]")
            return
        }

        let startDate = Date(timeIntervalSince1970: startTs)
        let endDate = Date(timeIntervalSince1970: endTs)
        let allCalendars = store.calendars(for: .event)
        let calendars: [EKCalendar]
        if let ids = calendarIds {
            calendars = allCalendars.filter {
                ids.contains($0.calendarIdentifier)
            }
        } else {
            calendars = allCalendars
        }

        let predicate = store.predicateForEvents(
            withStart: startDate, end: endDate, calendars: calendars)
        let events = store.events(matching: predicate)

        let dateFormatter = ISO8601DateFormatter()
        var results: [[String: Any]] = []

        for event in events {
            let title = event.title ?? ""
            // Fuzzy match: strip non-alphanumeric, check
            // all query words match
            let normalize = { (s: String) -> String in
                s.lowercased().filter {
                    $0.isLetter || $0.isNumber || $0 == " "
                }
            }
            let normalizedTitle = normalize(title)
            let queryWords = query.split(separator: " ")
                .map { normalize(String($0)) }
                .filter { !$0.isEmpty }
            // Empty query matches everything
            if !queryWords.isEmpty {
                let allMatch = queryWords.allSatisfy {
                    normalizedTitle.contains($0)
                }
                guard allMatch else { continue }
            }

            let duration = Int(
                event.endDate.timeIntervalSince(event.startDate) * 1000)

            results.append([
                "id": event.eventIdentifier ?? UUID().uuidString,
                "title": title,
                "calendarId": event.calendar.calendarIdentifier,
                "calendarName": event.calendar.title,
                "calendarColor": getCalendarColorHex(event.calendar),
                "accountName": event.calendar.source.title,
                "notes": event.notes ?? "",
                "startDate": dateFormatter.string(
                    from: event.startDate),
                "endDate": dateFormatter.string(
                    from: event.endDate),
                "duration": duration,
                "isAllDay": event.isAllDay,
                "isRecurring": event.hasRecurrenceRules,
                "location": event.location ?? "",
                "url": event.url?.absoluteString ?? "",
                "occurrenceDate":
                    event.startDate.timeIntervalSince1970,
            ])
        }

        results.sort {
            ($0["startDate"] as? String ?? "")
                < ($1["startDate"] as? String ?? "")
        }

        if let jsonData = try? JSONSerialization.data(
            withJSONObject: results),
           let jsonString = String(
               data: jsonData, encoding: .utf8) {
            print(jsonString)
        } else {
            print("[]")
        }
    }

    semaphore.wait()
    exit(0)
}

// Events query mode
guard args.count >= 4 else {
    print("[]")
    exit(0)
}

guard let startTimestamp = Double(args[1]),
      let endTimestamp = Double(args[2]) else {
    print("[]")
    exit(0)
}

let calendarIds = Set(args[3...])
let startDate = Date(timeIntervalSince1970: startTimestamp)
let endDate = Date(timeIntervalSince1970: endTimestamp)

let store = EKEventStore()
let semaphore = DispatchSemaphore(value: 0)

store.requestFullAccessToEvents { granted, error in
    defer { semaphore.signal() }
    
    if let error = error {
        fputs("Calendar access error: \(error.localizedDescription)\n", stderr)
    }
    
    guard granted else {
        print("[]")
        return
    }
    
    // Get calendars matching the ids
    let allCalendars = store.calendars(for: .event)
    let selectedCalendars = allCalendars.filter { calendarIds.contains($0.calendarIdentifier) }
    
    guard !selectedCalendars.isEmpty else {
        print("[]")
        return
    }
    
    // Create predicate for date range - this is the fast query!
    let predicate = store.predicateForEvents(withStart: startDate, end: endDate, calendars: selectedCalendars)
    let events = store.events(matching: predicate)
    
    // Build JSON output
    var results: [[String: Any]] = []
    let dateFormatter = ISO8601DateFormatter()
    
    for event in events {
        let duration = Int(event.endDate.timeIntervalSince(event.startDate) * 1000) // milliseconds
        
        // Skip non-all-day events longer than 24 hours
        if !event.isAllDay && duration >= 24 * 60 * 60 * 1000 { continue }
        
        results.append([
            "id": event.eventIdentifier ?? UUID().uuidString,
            "title": event.title ?? "Untitled",
            "calendarId": event.calendar.calendarIdentifier,
            "calendarName": event.calendar.title,
            "calendarColor": getCalendarColorHex(event.calendar),
            "accountName": event.calendar.source.title,
            "notes": event.notes ?? "",
            "startDate": dateFormatter.string(
                from: event.startDate),
            "endDate": dateFormatter.string(
                from: event.endDate),
            "duration": duration,
            "isAllDay": event.isAllDay,
            "isRecurring": event.hasRecurrenceRules,
            "location": event.location ?? "",
            "url": event.url?.absoluteString ?? "",
            "occurrenceDate":
                event.startDate.timeIntervalSince1970,
        ])
    }
    
    // Sort by start date
    results.sort { 
        ($0["startDate"] as? String ?? "") < ($1["startDate"] as? String ?? "")
    }
    
    // Output JSON
    if let jsonData = try? JSONSerialization.data(withJSONObject: results),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    } else {
        print("[]")
    }
}

semaphore.wait()
