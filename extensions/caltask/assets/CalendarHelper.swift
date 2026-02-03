#!/usr/bin/env swift

import EventKit
import Foundation

// Parse command line arguments
// Usage: 
//   CalendarHelper list                                          - List all calendars with colors
//   CalendarHelper <startTimestamp> <endTimestamp> <id1> [id2] ... - Get events by calendar ids
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
        // Skip all-day events
        if event.isAllDay { continue }
        
        let duration = Int(event.endDate.timeIntervalSince(event.startDate) * 1000) // milliseconds
        
        // Skip events longer than 24 hours
        if duration >= 24 * 60 * 60 * 1000 { continue }
        
        results.append([
            "id": event.eventIdentifier ?? UUID().uuidString,
            "title": event.title ?? "Untitled",
            "calendarId": event.calendar.calendarIdentifier,
            "calendarName": event.calendar.title,
            "calendarColor": getCalendarColorHex(event.calendar),
            "accountName": event.calendar.source.title,
            "startDate": dateFormatter.string(from: event.startDate),
            "endDate": dateFormatter.string(from: event.endDate),
            "duration": duration
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
