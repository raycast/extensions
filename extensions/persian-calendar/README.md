# Persian Calendar for Raycast

An offline-first Persian (Jalali) calendar for Raycast, with Persian month names, weekdays, and numerals.

## Features

- **Persian Calendar:** Browse Jalali months and view date details with month navigation.
- **Convert Date:** Convert between Jalali and Gregorian dates, accepting English or Persian numerals.
- **Today's Date:** Type `چندمه` (or `today`) in Raycast search to find the command and see today's full Persian date in its subtitle, e.g. `امروز ۱۲ آبان ۱۴۰۵`.
- **Offline first:** All conversions use `jalaali-js` locally, with no external calendar API.
- **Iran timezone:** Today's date is calculated in `Asia/Tehran`.

Raycast's command controls and form labels are in English; calendar-specific names and displayed Jalali dates remain in Persian.

## Commands

### Persian Calendar
Browse the monthly calendar and inspect an individual day. Use the Action Panel for previous and next months, jumping to today, and copying dates.

### Convert Date
Choose a conversion direction and enter a date.

### Today's Date
Search for `چندمه`, `امروز`, or `Today's Date` to see the current Persian date. Launch the command once to initialize the dynamic subtitle.

## Getting Started

Install the extension from the Raycast Store, then search for any of the three commands. No accounts, API keys, or external services are required.

## Technology

Raycast API, React, TypeScript, `jalaali-js`, and Raycast utilities.

## License

MIT
