# Raycast Developer Utilities

A collection of useful Raycast commands designed for developers.

## Commands

### Timestamp Converter

Easily convert between Unix timestamps (seconds or milliseconds) and human-readable date/time formats, with support for different timezones.

**Features:**

*   **Convert Timestamp to Date/Time:** Enter a 10-digit (seconds) or 13-digit (milliseconds) Unix timestamp to see the corresponding date and time.
*   **Convert Date/Time to Timestamp:** Use the date picker or manually input Year, Month, Day, Hour, Minute, Second (and optionally Millisecond) to get the corresponding Unix timestamp.
*   **Live Updates:** All fields update in real-time as you type - modify the timestamp to see the date components change instantly, or adjust any date component to see the timestamp update.
*   **Timezone Support:** Select a timezone (GMT, UTC+/- offsets) to view the date/time components in that specific zone. The underlying timestamp always remains UTC.
*   **Milliseconds Toggle:** Switch between using seconds or milliseconds for the timestamp value.
*   **Clipboard Detection:** Automatically detects and parses timestamps from your clipboard when the command is opened.
*   **Relative Time:** Shows the time relative to now (e.g., "5 minutes ago", "in 2 hours").

**Usage:**

1.  Open Raycast and type the command name (e.g., "Convert Timestamp").
2.  The current date/time and timestamp will be pre-filled.
3.  You can:
    *   Paste or type a Unix timestamp into the "Unix Timestamp" field to instantly see the corresponding date and time
    *   Use the "Date" picker to select a date
    *   Manually edit any of the Year, Month, Day, Hour, Minute, Second, or Millisecond fields to see the timestamp update in real-time
    *   Change the "Timezone" dropdown
4.  All fields will update automatically as you make changes.
5.  Press Enter to copy the current Unix timestamp to your clipboard.
6.  Use the Action Panel (`⌘K`) to toggle between using seconds and milliseconds.

*(More commands coming soon!)*
