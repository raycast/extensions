# Time Zone Converter

Convert times and time ranges across multiple time zones — paste the results directly into any app.

## Features

- Convert a single time or a time range across any number of locations
- Automatic overnight detection for ranges (e.g. 11 PM – 1 AM)
- Day labels shown when any time zone in the output spans midnight
- Natural language time input via chrono-node
- City names, region names, airport codes, and timezone abbreviations all accepted
- List or inline output format, configurable per conversion and as a default preference

## Usage

1. Open Raycast and type **Convert Time**
2. Enter a time or time range in the **Time** field
3. Optionally enter locations in the **Locations** field (comma-separated), or leave blank to use your defaults
4. Choose **Inline** or **List** output format
5. Press Enter — the result is copied and pasted automatically

## Supported Time Inputs

### Single times

| Input | Interpreted as |
|---|---|
| `3PM` | 3:00 PM today |
| `3:30PM` or `3:30 PM` | 3:30 PM today |
| `15:30` | 3:30 PM today (24-hour) |
| `now` | Current time |
| `noon` | 12:00 PM today |
| `midnight` | 12:00 AM today |

### Natural language (via chrono-node)

| Input | Example |
|---|---|
| Relative days | `tomorrow 3pm`, `yesterday noon` |
| Named weekdays | `next Friday 2pm`, `Monday at 9am` |
| Relative offsets | `in 3 hours`, `in 30 minutes` |
| Named dates | `Christmas 5pm`, `New Year's Eve 11pm` |
| Full dates | `March 15 2pm`, `Apr 3 at 10:30am` |

### Time ranges

Append a second time using any of these separators:

| Separator | Example |
|---|---|
| `-` (hyphen) | `1pm - 3pm` |
| `–` (en dash) | `1pm – 3pm` |
| `to` | `1pm to 3pm` |
| `through` | `11pm through 1am` |
| `until` | `2pm until 4pm` |

Ranges can include a date: `next Friday 1pm - 3pm`

Overnight ranges are detected automatically — `11pm - 1am` correctly places the end time the following day.

## Day Labels in Range Output

Day labels (e.g. **Friday**, **Saturday**) appear automatically when:

- Any location's output spans midnight, **or**
- The input includes an explicit date

When a range spans midnight in a given timezone, each time in the pair gets its own label:
```
11:00 PM (Friday) - 12:00 AM (Saturday) Austin
```

When a range stays within the same day, one label follows the end time:
```
5:00 AM - 6:00 AM (Saturday) London
```

## Supported Location Inputs

- **City names**: London, Tokyo, Austin, Sydney
- **Region / country names**: Eastern, Pacific, Central, Japan, India, Australia
- **Timezone abbreviations**: EST, CST, PST, CET, JST, IST, AEST
- **Airport / short codes**: NYC, LAX, SFO, LHR, CDG, DXB
- **Informal names**: UK, LA, SF, DC, Dubai, China, Brazil

## Output Formats

**Inline** — times separated by `/`, suitable for pasting into Slack or email:
```
11:00 PM (Friday) - 12:00 AM (Saturday) Austin / 5:00 AM - 6:00 AM (Saturday) London / 2:00 PM - 3:00 PM (Saturday) Sydney
```

**List** — one location per line, suitable for meeting invites or documents:
```
• 11:00 PM (Friday) - 12:00 AM (Saturday) Austin
• 5:00 AM - 6:00 AM (Saturday) London
• 2:00 PM - 3:00 PM (Saturday) Sydney
```

## Preferences

Set defaults in **Raycast Preferences → Extensions → Time Zone Converter**:

| Preference | Description | Default |
|---|---|---|
| Default Locations | Comma-separated list of locations | Austin, London, Tokyo |
| Default Format | Inline or List | Inline |

## Development

```bash
npm install
npm run dev      # development mode with hot reload
npm run build    # production build
npm run lint     # lint check
npm run publish  # submit to Raycast Store
```

## License

MIT
