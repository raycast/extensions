# Vietnamese Calendar

A comprehensive Vietnamese Lunar Calendar for Raycast. View Solar and Lunar dates, check holidays with anniversary counts, and navigate easily with shortcuts.

## Features

- **Visual Calendar**: Monthly grid displaying both Solar (Gregorian) and Lunar (Vietnamese) dates.
- **Week Numbers**: See the current week of the year (ISO-8601) directly in the calendar header.
- **Vietnamese Holidays**: Comprehensive list of traditional Lunar holidays and modern Solar holidays.
- **Anniversary & Age Counts**: Automatically calculates and displays years for significant historical events and ages for birthdays (e.g., "Quốc Khánh (80 năm)", "Sinh nhật Bác (135 tuổi)").
- **Rich Day Details**:
  - View **Can Chi** information (Thiên Can, Địa Chi) for Year, Month, and Day.
  - See relative date information (e.g., "2 days ago", "in 1 week").
  - **Solar & Lunar Cycles**: Switch between Solar and Lunar occurrences to track anniversaries across 10 years.
  - **Smart Selection**: Automatically defaults to Lunar Cycle for holidays and significant lunar dates (1st/15th).
- **Date Conversion**: Quickly convert between Solar and Lunar dates using a dedicated command with search-bar input.

## Visual Cues

The calendar uses specific colors to help you identify important dates at a glance:

- **Blue Text**: Current day (Today).
- **Red Text (Solar)**: Weekends (Saturday & Sunday) and Official Vietnamese Holidays.
- **Red Text (Lunar)**: 1st (Mùng 1) and 15th (Rằm) of the Lunar month.
- **Gold ✨**: Indicates a holiday or special event on that day.

## Commands

### View Calendar

Shows a visual calendar grid.

- **Arrow Keys**: Navigate through days.
- **Cmd + Arrow Left/Right**: Previous/Next month.
- **Cmd + Shift + Arrow Left/Right**: Previous/Next year.
- **Cmd + T**: Jump to today.
- **Enter**: View detailed information for the selected date.

### View Events

Lists all holidays and special events for the current year.

- **Enter**: View details and future occurrences of the selected holiday.

### Convert Date

Convert between Solar and Lunar dates directly from the search bar.

- **Dropdown**: Switch between `Solar → Lunar` and `Lunar → Solar` modes.
- **Search Bar**: Type any date format (e.g., `29/12/2025`, `10/11`) to see the conversion result instantly.
- **Enter**: View full details for the converted date.

## Author

Created by [hoando](https://www.raycast.com/hoando).

## License

MIT
