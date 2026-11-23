# Strict Time Converter

Convert Unix timestamps and Chinese/English date strings locally, with explicit checks for ambiguous dates, time-zone abbreviations, invalid weekdays, and daylight-saving transitions. The command interface is in Chinese; this extension is designed for users working with Chinese and English date representations together.

## Usage

Open **Convert Time**, enter a timestamp or date, and press Return to copy the selected result. Empty input shows the current time. The default time zone is your system's local zone; switch between local, Beijing, and UTC in the dropdown.

For a short launcher shortcut, assign the alias `ts` in Raycast Settings for **Convert Time**. Aliases are personal Raycast settings and are not installed by extensions.

| Input                                   | Meaning                                                     |
| --------------------------------------- | ----------------------------------------------------------- |
| `1700000000` / `1700000000123`          | Unix seconds / milliseconds                                 |
| `1700000000.123s` / `1000ms`            | Explicit units; fractional seconds to millisecond precision |
| `2026-10-15T12:00:00.123+08:00`         | ISO 8601 / common RFC 3339 timestamp                        |
| `2026-10-15 12:00:00`                   | SQL-style date-time in the selected zone                    |
| `2026/10/15 12:00` / `2026.10.15 12:00` | Year-first slash / dot date                                 |
| `2026年10月15日 下午3点04分05秒`        | Chinese date and afternoon time                             |
| `2026-10-15 3:04:05 PM`                 | 12-hour clock                                               |
| `October 15, 2026 12:00 PM`             | English month                                               |
| `Thu, 15 Oct 2026 12:00:00 +0800`       | RFC 2822-style mail date                                    |
| `Thu, 15 Oct 2026 04:00:00 GMT`         | HTTP / RFC 1123 date                                        |
| `Thu Oct 15 12:00:00 2026`              | ctime / asctime                                             |
| `us:03/04/2026` / `eu:03/04/2026`       | Explicit month/day/year or day/month/year                   |
| `date:20261015` / `20261015120000`      | Compact date / date-time                                    |
| `20261015T120000+0800`                  | ISO basic date-time                                         |
| `2026-W42-4` / `2026-288`               | ISO week date / ordinal date                                |
| `now` or empty input                    | Current time, refreshed every second                        |

Results include Unix seconds, milliseconds, local date-time, UTC ISO, ISO with the selected zone's offset, RFC 2822, HTTP, compact date-time, and UTC date-time.

## Predictable Parsing

- Numeric offsets and `Z`, `UTC`, or `GMT` override the selected zone. Dates without an offset use the selected zone.
- `03/04/2026` is rejected by default because either March 4 or April 3 could be intended. Use `us:` / `eu:`, choose the corresponding action, or set the **月/日顺序** (date order) preference.
- `CST`, `IST`, and other ambiguous time-zone abbreviations are rejected. Use a numeric offset instead.
- Nonexistent dates, inconsistent weekday names, daylight-saving gaps, and repeated local times without an explicit offset are rejected.
- Bare eight-digit numbers retain their Unix-seconds meaning; use `date:` for compact dates. Bare fourteen-digit numbers are interpreted as `YYYYMMDDHHmmss`. Explicit `s` / `ms` suffixes override numeric unit detection.
- Precision is milliseconds. Microseconds, nanoseconds, leap seconds, and fractional seconds beyond three digits are not supported. Seconds, RFC, HTTP, and compact results have second precision; millisecond and ISO results retain milliseconds.

## Shortcuts

| Shortcut    | Action                       |
| ----------- | ---------------------------- |
| Return      | Copy selected result         |
| Cmd+Shift+S | Copy Unix seconds            |
| Cmd+Shift+M | Copy Unix milliseconds       |
| Cmd+Shift+D | Copy date-time               |
| Cmd+Shift+V | Read clipboard on request    |
| Cmd+N       | Show current time            |
| Cmd+P       | Select time zone             |
| Cmd+K       | Actions and format reference |

All conversion happens locally. No network requests, accounts, credentials, clipboard monitoring, or external binaries are required. Clipboard text is read only when you select the action or invoke its shortcut.
