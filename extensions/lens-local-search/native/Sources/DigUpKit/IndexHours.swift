import Foundation

/// The hours of the day indexing may run when it's held to them ("Index only at set hours"): from `start` to `end`,
/// in minutes after midnight, across midnight when `end` comes first (01:00–07:00, or 22:00–06:00). The same start
/// and end mean all day.
public struct IndexHours: Equatable, Sendable {
    public let start: Int
    public let end: Int

    public init(start: Int, end: Int) {
        self.start = (start % 1440 + 1440) % 1440
        self.end = (end % 1440 + 1440) % 1440
    }

    /// 01:00–07:00: the night, when a Mac that's left on has nothing else to do.
    public static let night = IndexHours(start: 60, end: 420)

    /// Whether indexing may run at `date`.
    public func contains(_ date: Date, calendar: Calendar = .current) -> Bool {
        guard start != end else { return true }
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        let minute = (parts.hour ?? 0) * 60 + (parts.minute ?? 0)
        return start < end ? minute >= start && minute < end : minute >= start || minute < end
    }

    /// When `contains` changes next after `date`: the next end inside the hours, the next start outside them. A time
    /// a clock change skips (02:30 on the night clocks go forward) counts as the next one that exists. Nil: all day.
    public func nextChange(after date: Date, calendar: Calendar = .current) -> Date? {
        guard start != end else { return nil }
        let minute = contains(date, calendar: calendar) ? end : start
        return calendar.nextDate(after: date, matching: DateComponents(hour: minute / 60, minute: minute % 60, second: 0),
                                 matchingPolicy: .nextTime)
    }
}
