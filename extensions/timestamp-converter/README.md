# Timestamp Converter

A single-screen Raycast utility for working with Unix timestamps.

## Features

- View and copy the current timestamp in real time.
- Convert a timestamp to a date and time in any supported IANA time zone.
- Convert a date and time in a selected time zone to a timestamp.
- Type a date and time in `YYYY-MM-DD HH:mm:ss` format or choose it from the calendar.
- Switch globally between seconds and milliseconds. The selected unit is remembered and applies to all three sections.

## Usage

1. Run `Convert Timestamp` in Raycast.
2. Select seconds or milliseconds from the global unit field.
3. Enter a timestamp or choose a date and time. Results update immediately.
4. Open the action panel to copy the current timestamp, either conversion result, or a complete report.

The value in the date and time picker is interpreted as local time in the selected time zone. For example, `2026-09-03 13:52:15` with `Asia/Shanghai` represents that local time in Shanghai.
