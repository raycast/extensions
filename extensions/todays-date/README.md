# Today's Date

![Today's Date pinned to the top of Raycast's root search with the formatted date shown as a subtitle](media/root-search.png)

A Raycast [no-view command](https://developers.raycast.com/information/lifecycle/commands#no-view-commands) that shows the current date and time as a live subtitle on Raycast's root search, styled like the built-in "Currently Playing Track" command. Pressing enter copies the formatted value to your clipboard.

The subtitle refreshes every minute in the background.

## Preferences

| Preference | Type | Default | Description |
|---|---|---|---|
| Timezone | dropdown | `Etc/UTC` | Any IANA zone (e.g. `America/Chicago`, `Asia/Tokyo`) — handles DST automatically. Fixed offsets are listed as `UTC-12` through `UTC+14`. |
| Date Format | textfield | `%A, %B %d, %Y` | strftime format string used to render the date. |

## Format string

The `Date Format` preference is a strftime template, rendered by the [strftime](https://github.com/samsonjs/strftime) library. The full POSIX strftime directive set is supported — see [devhints.io/strftime](https://devhints.io/strftime) for the complete reference. Common directives:

| Directive | Meaning | Example |
|---|---|---|
| `%Y` | Year, 4 digits | `2026` |
| `%y` | Year, 2 digits | `26` |
| `%m` / `%-m` | Month, zero-padded / unpadded | `07` / `7` |
| `%B` / `%b` | Month name, full / abbreviated | `July` / `Jul` |
| `%d` / `%-d` | Day of month, zero-padded / unpadded | `04` / `4` |
| `%e` | Day of month, space-padded | ` 4` |
| `%A` / `%a` | Weekday, full / abbreviated | `Friday` / `Fri` |
| `%H` / `%-H` | Hour (24h), zero-padded / unpadded | `09` / `9` |
| `%I` / `%-I` | Hour (12h), zero-padded / unpadded | `09` / `9` |
| `%M` / `%-M` | Minute, zero-padded / unpadded | `05` / `5` |
| `%S` / `%-S` | Second, zero-padded / unpadded | `07` / `7` |
| `%p` | AM/PM | `PM` |
| `%j` | Day of year, 3 digits | `194` |
| `%U` / `%W` | Week of year (Sunday-based / Monday-based) | `28` |
| `%s` | Unix timestamp (seconds) | `1784376000` |
| `%o` | Day of month with ordinal suffix | `4th` |
| `%D` / `%F` | Shorthand for `%m/%d/%y` / `%Y-%m-%d` | `07/04/26` / `2026-07-04` |
| `%r` / `%R` / `%T` | 12h time / `%H:%M` / `%H:%M:%S` | `02:32:07 PM` / `14:32` / `14:32:07` |
| `%%` | Literal `%` | `%` |

Any directive can be modified with `-` (no padding), `_` (space padding), or `0` (zero padding), e.g. `%-d`, `%_H`.

### Example formats

| Format string | Output |
|---|---|
| `%A, %B %d, %Y` | `Friday, July 10, 2026` |
| `%Y-%m-%d` | `2026-07-10` |
| `%Y-%m-%d %H:%M` | `2026-07-10 14:32` |
| `%-I:%M %p` | `2:32 PM` |
| `%a %b %-d` | `Fri Jul 10` |
