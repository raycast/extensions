# Changelog

## [1.3.5] - 2026-03-01

- fix: View Events now shows a separate row for each event on the same date (e.g. Mother's Day + Rằm). Dates with multiple events (solar + lunar, or multiple solar) no longer collapse to a single row.
- feat: Add Windows to supported platforms (Raycast for Windows).
- chore: Updated dependencies (`@raycast/api`, `@types/node`, `@types/react`, `prettier`) for compatibility and security.

## [1.3.3] - 2026-02-12

- feat: Add Vietnamese day labels (T2-CN) to calendar grid for better readability.
- feat: Auto-select nearest event to today in Events view for quick access.
- feat: Enhanced search keywords in calendar (day number and lunar date).
- fix: Improve selection state management to prevent UI flash when navigating.

## [1.3.2] - 2026-02-04

- Added "Week Count Cycle" view to support recurring holidays like Mother's Day and Father's Day.
- Updated Mother's Day and Father's Day to display future dates based on week count logic.
- Marked "Văn hoá VN" (24/11) as an official holiday.

## [1.3.1] - 2026-01-20

- feat: Add "Văn hoá VN" event (Nov 24) starting from 2026.

## [1.3.0] - 2026-01-15

- feat: Add Solar/Lunar date cycle switch in Day Detail view to track recurring events.
- feat: Smart date selection: automatically defaults to Lunar Cycle for lunar holidays and important lunar days (1st/15th).
- fix: Improve library integration for broader date calculation support.

## [1.2.0] - 2025-12-29

- feat: Add `Convert Date` command to quickly convert between Solar and Lunar dates.
- feat: Implement search-bar based conversion with mode selection dropdown.
- fix: Implement robust regex-based date parsing for reliable date detection (handling various separators and spaces).
- fix: Ensure proper initialization of Lunar dates for correct conversion.

## [1.1.0] - 2025-12-29

- feat: Display week numbers (Wxx) in the calendar header.
- feat: Add anniversary/age counts for holidays and birthdays (e.g., "Quốc Khánh (80 năm)").
- feat: Enhanced UI highlighting:
  - Blue text for Today.
  - Red text for Weekends and Official Holidays.
  - Red text for Lunar 1st and 15th (Mùng 1/Rằm).
- feat: New navigation shortcuts (`Cmd + T` for Today, `Cmd + Shift + Arrows` for Year navigation).
- feat: Improved Day Detail view:
  - View Can Chi details (Year, Month, Day).
  - Relative date information (e.g., "in 3 days").
  - View occurrences of the same date across the next 10 years.

## [1.0.0] - 2025-12-29

- Added `View Calendar` command with Solar and Lunar dates.
- Added `View Events` command for Vietnamese holidays.
- Implemented monthly navigation and "Today" highlighting.
