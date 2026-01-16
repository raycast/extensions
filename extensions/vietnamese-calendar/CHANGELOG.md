# Changelog

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
