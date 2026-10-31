import Foundation
import Testing
@testable import DigUpKit

@Suite struct IndexHoursTests {
    /// A zone with daylight saving time, so the tests mean the same on any machine.
    let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Berlin")!
        return calendar
    }()

    /// "2026-10-12 23:30" in that zone.
    func at(_ text: String) -> Date {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.date(from: text)!
    }

    @Test func hoursAcrossMidnight() {
        let night = IndexHours(start: 22 * 60, end: 6 * 60)
        #expect(night.contains(at("2026-10-12 23:30"), calendar: calendar))
        #expect(night.contains(at("2026-10-13 05:59"), calendar: calendar))
        #expect(!night.contains(at("2026-10-13 06:00"), calendar: calendar))
        #expect(!night.contains(at("2026-10-12 21:59"), calendar: calendar))
        #expect(night.nextChange(after: at("2026-10-12 23:30"), calendar: calendar) == at("2026-10-13 06:00"))
        #expect(night.nextChange(after: at("2026-10-12 12:00"), calendar: calendar) == at("2026-10-12 22:00"))
    }

    @Test func hoursWithinADay() {
        let hours = IndexHours.night   // 01:00–07:00
        #expect(hours.contains(at("2026-10-12 01:00"), calendar: calendar))
        #expect(!hours.contains(at("2026-10-12 07:00"), calendar: calendar))
        #expect(hours.nextChange(after: at("2026-10-12 08:00"), calendar: calendar) == at("2026-10-13 01:00"))
        #expect(hours.nextChange(after: at("2026-10-12 00:59"), calendar: calendar) == at("2026-10-12 01:00"))
        #expect(hours.nextChange(after: at("2026-10-12 03:00"), calendar: calendar) == at("2026-10-12 07:00"))
    }

    @Test func theSameStartAndEndMeanAllDay() {
        let all = IndexHours(start: 120, end: 120)
        #expect(all.contains(at("2026-10-12 15:00"), calendar: calendar))
        #expect(all.nextChange(after: at("2026-10-12 15:00"), calendar: calendar) == nil)
    }

    @Test func aStartTheClockSkipsComesAtTheNextTimeThatExists() {
        // Berlin's clocks went from 02:00 to 03:00 on 2026-03-29: 02:30 never came that night.
        let hours = IndexHours(start: 150, end: 300)   // 02:30–05:00
        #expect(hours.nextChange(after: at("2026-03-29 01:00"), calendar: calendar) == at("2026-03-29 03:00"))
    }
}
