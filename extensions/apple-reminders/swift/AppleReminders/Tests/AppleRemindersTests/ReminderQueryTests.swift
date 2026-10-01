import EventKit
import XCTest
@testable import AppleReminders

final class ReminderQueryTests: XCTestCase {
  private let store = EKEventStore()
  private let now = Calendar.current.date(from: DateComponents(year: 2026, month: 9, day: 30, hour: 12))!

  private func reminder(_ title: String, day: Int? = nil, hour: Int? = nil) -> EKReminder {
    let reminder = EKReminder(eventStore: store)
    reminder.title = title
    if let day {
      reminder.dueDateComponents = DateComponents(
        year: 2026, month: 9, day: day, hour: hour, minute: hour == nil ? nil : 0
      )
    }
    return reminder
  }

  func testMissingListIsAnErrorRatherThanAnEmptyResult() {
    XCTAssertThrowsError(try calendarsForReminderQuery(listId: "deleted-list", calendars: [])) { error in
      guard case RemindersError.noListFound = error else {
        return XCTFail("Expected noListFound, got \(error)")
      }
      XCTAssertTrue(error.localizedDescription.contains("no longer exists"))
    }
  }

  func testAnExistingEmptyListAndSmartViewsAreValid() throws {
    let list = EKCalendar(for: .reminder, eventStore: store)
    list.title = "Empty list"
    let selected = try calendarsForReminderQuery(listId: list.calendarIdentifier, calendars: [list])
    XCTAssertEqual(selected?.map(\.calendarIdentifier), [list.calendarIdentifier])
    for listId: String? in [nil, "all", "today", "overdue", "scheduled"] {
      XCTAssertNil(try calendarsForReminderQuery(listId: listId, calendars: []))
    }
  }

  func testSearchMatchesEnglishMonthNamesUsedByTheReminderRow() {
    let item = reminder("Due date", day: 30)
    XCTAssertEqual(remindersMatchingQuery([item], listId: "all", searchText: "September").count, 1)
    let completed = reminder("Completed date")
    completed.isCompleted = true
    completed.completionDate = now
    XCTAssertEqual(remindersMatchingQuery([completed], listId: "all", searchText: "September").count, 1)
  }

  func testTodayIsFilteredBeforeTheResultLimit() {
    let unrelated = (0..<1100).map { reminder("Undated \($0)") }
    let dueToday = (0..<22).map { reminder("Today \($0)", day: 30) }
    let results = remindersMatchingQuery(unrelated + dueToday, listId: "today", searchText: nil, now: now)
    XCTAssertEqual(results.map(\.title), dueToday.map(\.title))
  }

  func testMovingBetweenListsKeepsReminderInToday() {
    let item = reminder("Move me", day: 30)
    let source = EKCalendar(for: .reminder, eventStore: store)
    source.title = "Personal"
    let destination = EKCalendar(for: .reminder, eventStore: store)
    destination.title = "Work"
    item.calendar = source
    XCTAssertEqual(remindersMatchingQuery([item], listId: "today", searchText: nil, now: now).count, 1)
    item.calendar = destination
    let unrelated = (0..<1100).map { reminder("Other \($0)") }
    XCTAssertEqual(remindersMatchingQuery(unrelated + [item], listId: "today", searchText: nil, now: now).count, 1)
  }

  func testSearchFindsIncompleteAndCompletedRemindersBeyondTheLimit() {
    for completed in [false, true] {
      let reminders = (0..<1100).map { reminder("Task \($0)") }
      reminders.forEach { $0.isCompleted = completed }
      let result = remindersMatchingQuery(reminders, listId: "all", searchText: "Task 1099", now: now)
      XCTAssertEqual(result.map(\.title), ["Task 1099"])
    }
  }

  func testBlankSearchRemainsBoundedWithOneExtraResultToDetectTruncation() {
    let reminders = (0..<1100).map { reminder("Task \($0)") }
    XCTAssertEqual(remindersMatchingQuery(reminders, listId: nil, searchText: " \n ").count, 1001)
    XCTAssertEqual(remindersMatchingQuery(Array(reminders.prefix(1000)), listId: nil, searchText: nil).count, 1000)
  }

  func testSmartListsRespectAllDayAndTimedDeadlines() {
    let reminders = [
      reminder("Yesterday", day: 29), reminder("Today", day: 30),
      reminder("Morning", day: 30, hour: 9), reminder("Tonight", day: 30, hour: 20),
      reminder("Tomorrow", day: 31), reminder("Undated"),
    ]
    XCTAssertEqual(
      remindersMatchingQuery(reminders, listId: "today", searchText: nil, now: now).map(\.title),
      ["Yesterday", "Today", "Morning", "Tonight"]
    )
    XCTAssertEqual(
      remindersMatchingQuery(reminders, listId: "overdue", searchText: nil, now: now).map(\.title),
      ["Yesterday", "Morning"]
    )
    XCTAssertEqual(remindersMatchingQuery(reminders, listId: "scheduled", searchText: nil, now: now).count, 5)
    XCTAssertEqual(remindersMatchingQuery(reminders, listId: "missing", searchText: nil, now: now).count, 0)
  }

  func testSearchMatchesAcrossFieldsIgnoringCaseAndDiacritics() {
    let item = reminder("Café booking")
    item.notes = "Call José\n\n#travel"
    item.priority = 1
    let list = EKCalendar(for: .reminder, eventStore: store)
    list.title = "Work"
    item.calendar = list
    XCTAssertEqual(
      remindersMatchingQuery([item], listId: "all", searchText: "CAFE jose #travel high work").count, 1
    )
    XCTAssertEqual(remindersMatchingQuery([item], listId: "all", searchText: "cafe missing").count, 0)
    XCTAssertEqual(remindersMatchingQuery([item], listId: list.calendarIdentifier, searchText: "cafe").count, 1)
    XCTAssertEqual(remindersMatchingQuery([item], listId: list.calendarIdentifier, searchText: "work").count, 0)
  }
}
