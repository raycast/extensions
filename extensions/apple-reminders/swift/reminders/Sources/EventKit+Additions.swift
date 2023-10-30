import EventKit

let isoDateFormatter: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter
}()

let dateOnlyFormatter: DateFormatter = {
  let formatter = DateFormatter()
  formatter.dateFormat = "yyyy-MM-dd"
  return formatter
}()

let monthSymbols = DateFormatter().monthSymbols

let numberFormatter: NumberFormatter = {
  let formatter = NumberFormatter()
  formatter.numberStyle = .ordinal
  return formatter
}()

func rgbaToHex(_ red: CGFloat, _ green: CGFloat, _ blue: CGFloat) -> String {
  return String(format: "#%02X%02X%02X", Int(red * 255), Int(green * 255), Int(blue * 255))
}

extension EKRecurrenceRule {
  var displayString: String? {
    guard let intervalDisplayString else { return nil }

    var result = "Repeats Every \(intervalDisplayString)"

    switch frequency {
    case .daily:
      return result
    case .weekly:
      if let displayString = daysOfTheWeekDisplayString {
        result += displayString
      }
    case .monthly:
      if let displayString = daysOfTheMonthDisplayString {
        result += displayString
      }
      if let displayString = daysOfTheWeekDisplayString {
        result += displayString
      }
      if let displayString = monthsOfTheYearDisplayString {
        result += displayString
      }
    case .yearly:
      if let displayString = daysOfTheWeekDisplayString {
        result += displayString
      }
      if let displayString = monthsOfTheYearDisplayString {
        result += displayString
      }
    @unknown default:
      break
    }

    return result
  }

  private var intervalDisplayString: String? {
    switch frequency {
    case .daily: return interval > 1 ? "\(interval) Days" : "Day"
    case .weekly: return interval > 1 ? "\(interval) Weeks" : "Week"
    case .monthly: return interval > 1 ? "\(interval) Months" : "Month"
    case .yearly: return interval > 1 ? "\(interval) Years" : "Year"
    @unknown default: return nil
    }
  }

  private var daysOfTheWeekDisplayString: String? {
    guard frequency == .weekly || frequency == .monthly || frequency == .yearly else { return nil }
    guard let days = daysOfTheWeek, !days.isEmpty else { return nil }

    if days.count == 7 {
      return " on Every Day"
    } else if days.isWeekday {
      return " on Every Weekday"
    } else if !days.isWeekday {
      return " on Every Weekend Day"
    } else {
      return " on \(days.displayString)"
    }
  }

  private var daysOfTheMonthDisplayString: String? {
    guard frequency == .monthly else { return nil }
    guard let days = daysOfTheMonth, !days.isEmpty else { return nil }
    let formattedDays = days.compactMap {
      numberFormatter.string(for: $0)
    }.formatted()
    return " on \(formattedDays)"
  }

  private var monthsOfTheYearDisplayString: String? {
    guard frequency == .yearly else { return nil }
    guard let months = monthsOfTheYear, !months.isEmpty else { return nil }

    if months.count == 12 {
      return " of Every Month"
    } else {
      let formattedMonths = months.compactMap { monthSymbols?[$0.intValue] }.formatted()
      return " in \(formattedMonths)"
    }
  }
}

extension Array where Element == EKRecurrenceDayOfWeek {
  fileprivate var isWeekday: Bool {
    let weekdays: Set<EKWeekday> = [.monday, .tuesday, .wednesday, .thursday, .friday]
    return Set(self.map { $0.dayOfTheWeek }) == weekdays
  }

  fileprivate var displayString: String {
    return sorted { $0.dayOfTheWeek.rawValue < $1.dayOfTheWeek.rawValue }
      .compactMap { $0.displayString }.formatted()
  }
}

extension EKRecurrenceDayOfWeek {

  fileprivate var displayString: String {
    var result = ""

    if weekNumber == -1 {
      result += "the last "
    } else if weekNumber > 0,
      let formattedNumber = numberFormatter.string(for: NSNumber(value: weekNumber))
    {
      result += "the \(formattedNumber) "
    }

    result += "\(dayOfTheWeek.displayString)"

    return result
  }
}

extension EKWeekday {
  fileprivate var displayString: String {
    switch self {
    case .monday: return "Monday"
    case .tuesday: return "Tuesday"
    case .wednesday: return "Wednesday"
    case .thursday: return "Thursday"
    case .friday: return "Friday"
    case .saturday: return "Saturday"
    case .sunday: return "Sunday"
    }
  }
}

extension EKReminderPriority {
  var displayString: String {
    switch self {
    case .low:
      return "low"
    case .medium:
      return "medium"
    case .high:
      return "high"
    default:
      return ""
    }
  }
}

extension EKReminder {
  func toDictionary() -> [String: Any] {
    var dueDateString: String = ""
    if let dueDateComponents,
      let dueDate = Calendar.current.date(from: dueDateComponents)
    {
      dueDateString = isoDateFormatter.string(for: dueDate) ?? ""
    }

    var completionDateString: String = ""
    if let completionDate {
      completionDateString = isoDateFormatter.string(for: completionDate) ?? ""
    }

    let reminderPriority = EKReminderPriority(rawValue: UInt(self.priority)) ?? .none

    let isRecurring = self.recurrenceRules?.isEmpty == false
    let recurrenceRuleDescription = self.recurrenceRules?.first?.displayString

    var reminderDict: [String: Any] = [
      "id": self.calendarItemIdentifier,
      "openUrl": "x-apple-reminderkit://REMCDReminder/\(self.calendarItemIdentifier)",
      "title": self.title ?? "",
      "notes": self.notes ?? "",
      "dueDate": dueDateString,
      "isCompleted": self.isCompleted,
      "priority": reminderPriority.displayString,
      "completionDate": completionDateString,
      "isRecurring": isRecurring,
      "recurrenceRule": recurrenceRuleDescription ?? "",
    ]

    if let calendar = self.calendar {
      let color = calendar.cgColor?.components
      let hexColor = color != nil ? rgbaToHex(color![0], color![1], color![2]) : "#000000"

      reminderDict["list"] = [
        "id": calendar.calendarIdentifier,
        "title": calendar.title,
        "color": hexColor,
      ]
    }

    return reminderDict
  }
}

extension EKCalendar {
  func toDictionary() -> [String: Any] {
    let color = self.cgColor?.components
    let hexColor = color != nil ? rgbaToHex(color![0], color![1], color![2]) : "#000000"

    return [
      "id": self.calendarIdentifier,
      "title": self.title,
      "type": self.type.rawValue,
      "source": self.source.title,
      "allowsContentModifications": self.allowsContentModifications,
      "color": hexColor,
    ]
  }
}
