# Timezone Converter — Raycast Extension Spec (v2)

## Overview

A Raycast extension that converts times between timezones. The user types a natural query like `7:22 CET` or `7:22 CET to PST` into a single argument field and instantly sees the conversion to their local timezone, any specified target, and configured favorite timezones.

## Requirements

- **Input**: Single text argument — the user types `7:22 CET` as one string
- **Output**: List showing converted time in local timezone + favorites + optional explicit target
- **Timezone formats**: Abbreviations (`CET`), city names (`Berlin`), IANA identifiers (`Europe/Berlin`)
- **Actions**: Copy converted time to clipboard
- **Zero external dependencies**: All conversion via native `Intl` API

## Extension Manifest

```json
{
  "name": "timezone-converter",
  "title": "Timezone Converter",
  "description": "Convert times between timezones instantly. Type a time and timezone to see it in your local time.",
  "icon": "extension-icon.png",
  "author": "shivbhonde",
  "categories": ["Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "convert-time",
      "title": "Convert Time",
      "description": "Convert a time from one timezone to your local timezone and favorites",
      "mode": "view",
      "arguments": [
        {
          "name": "query",
          "type": "text",
          "placeholder": "7:22 CET or 7:22 CET to PST",
          "required": true
        }
      ]
    }
  ],
  "preferences": [
    {
      "name": "favoriteTimezones",
      "title": "Favorite Timezones",
      "description": "Comma-separated list of timezones to always show (e.g., America/New_York, CET, Tokyo)",
      "type": "textfield",
      "required": false,
      "default": ""
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.93.2",
    "@raycast/utils": "^1.19.1"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.11",
    "@types/node": "22.14.0",
    "@types/react": "19.0.8",
    "eslint": "^8.57.0",
    "prettier": "^3.5.3",
    "typescript": "^5.8.2"
  }
}
```

## Query Parsing

The single `query` argument is parsed as follows:

```
<time> <source_timezone> [to <target_timezone>]
```

**Examples**:
| Input | Time | Source | Target |
|-------|------|--------|--------|
| `7:22 CET` | 7:22 | CET | (local + favorites) |
| `7:22pm PST to CET` | 7:22 PM | PST | CET (+ local + favorites) |
| `19:22 Europe/Berlin` | 19:22 | Europe/Berlin | (local + favorites) |
| `3:00 Tokyo to New York` | 3:00 | Asia/Tokyo | America/New_York (+ local + favorites) |

**Time formats**:
- `7:22` or `07:22` — 24-hour
- `7:22pm` or `7:22 PM` — 12-hour
- `19:22` — 24-hour

**Parsing strategy**: Split on whitespace. The first token is the time (with optional am/pm suffix or second token). Look for a `to` keyword to separate source from explicit target. Everything between the time and `to` (or end of string) is the source timezone. Everything after `to` is the target timezone.

## Timezone Resolution

Resolve user input to IANA timezone identifiers in this priority order:

1. **Exact IANA match**: `Europe/Berlin` → `Europe/Berlin`
2. **Abbreviation lookup**: `CET` → `Europe/Berlin`
3. **City name match**: `Berlin` → `Europe/Berlin`, `KL` → `Asia/Kuala_Lumpur`, `New York` → `America/New_York`

### Ambiguous Abbreviations

Some abbreviations map to multiple timezones (e.g., `IST` = India, Israel, Ireland). When ambiguous:
- Show all possible conversions as separate list items
- Label each with the full region (e.g., "IST (India Standard Time)", "IST (Israel Standard Time)")
- Sort by geographic proximity to the user's local timezone (nearest first)

### Timezone Data

A single static map (`timezone-data.ts`) containing:
- ~40 common abbreviations → IANA identifiers (with arrays for ambiguous ones)
- ~80 common city/region names → IANA identifiers (including short forms like "KL", "NY", "LA")

This covers the vast majority of use cases without bloating the extension.

## UI Design

### List Layout

```
┌───────────────────────────────────────────────────┐
│ Convert Time: 7:22 CET                            │
├───────────────────────────────────────────────────┤
│                                                   │
│ 🏠 11:52 MYT              UTC+8 · Local · Today  │
│    Asia/Kuala_Lumpur                              │
│                                                   │
│ 🌐 01:22 EST              UTC-5 · Tomorrow        │
│    America/New_York                               │
│                                                   │
│ 🌐 07:22 CET              UTC+1 · Today           │
│    Europe/Berlin (source)                         │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Component Structure

```tsx
export default function ConvertTime(props: LaunchProps<{ arguments: { query: string } }>) {
  const { query } = props.arguments;
  const parsed = parseQuery(query);

  if (parsed.error) {
    return (
      <List>
        <List.EmptyView
          title="Couldn't parse your input"
          description={parsed.error}
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  const results = convertToTargets(parsed.time, parsed.sourceTimezone, getTargetTimezones(parsed));

  return (
    <List>
      <List.Section title={`${parsed.timeStr} ${parsed.sourceLabel}`}>
        {results.map((result) => (
          <List.Item
            key={result.ianaId}
            icon={result.isLocal ? Icon.House : Icon.Globe}
            title={`${result.formattedTime} ${result.abbreviation}`}
            subtitle={result.ianaId}
            accessories={[
              { text: `UTC${result.utcOffset}` },
              result.isLocal ? { tag: { value: "Local", color: Color.Green } } : {},
              result.dayOffset !== 0
                ? { tag: { value: result.dayOffset > 0 ? "+1 day" : "-1 day", color: Color.Orange } }
                : {},
            ].filter((a) => Object.keys(a).length > 0)}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Time"
                  content={`${result.formattedTime} ${result.abbreviation}`}
                />
                <Action.CopyToClipboard
                  title="Copy Time Only"
                  content={result.formattedTime}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
```

### Result Ordering

1. **Local timezone** (always first, marked with House icon and green "Local" tag)
2. **Explicit target** (if user typed `to <timezone>`)
3. **Favorite timezones** (from preferences, in configured order)
4. Deduplicate: if local or target is also in favorites, don't show twice

## Core Types

```typescript
interface ParsedQuery {
  timeStr: string;           // Original time portion: "7:22"
  hours: number;             // 7
  minutes: number;           // 22
  sourceTimezone: string;    // Resolved IANA id: "Europe/Berlin"
  sourceLabel: string;       // Original input: "CET"
  targetTimezone?: string;   // Resolved IANA id if "to X" was used
  error?: string;            // Parse error message if invalid
}

interface ConvertedTime {
  ianaId: string;            // "Asia/Kuala_Lumpur"
  abbreviation: string;      // "MYT"
  formattedTime: string;     // "11:52" (formatted per system locale)
  utcOffset: string;         // "+08:00"
  dayOffset: number;         // 0 = same day, 1 = next day, -1 = previous day
  isLocal: boolean;          // true for system timezone
  isSource: boolean;         // true for the source timezone
}
```

## Error Handling

| Scenario | UX |
|----------|-----|
| Invalid time (e.g., "25:00") | `List.EmptyView` with "Invalid time format" and hint |
| Unknown timezone | `List.EmptyView` with "Unknown timezone: {input}" and examples |
| Invalid favorite timezone | Toast warning on load: "Skipping unknown timezone: {value}" — still show valid ones |
| Empty query | `List.EmptyView` with usage instructions |

## File Structure

```
src/
  convert-time.tsx       # Command entry point + List UI
  timezone-utils.ts      # parseQuery, convertTime, resolveTimezone
  timezone-data.ts       # Static abbreviation/city → IANA mapping
```

Three files. The command handles rendering. Utilities handle logic. Data is separate because it's a large static map that would clutter the logic file.

## No Loading State

All computation is local and synchronous. No `isLoading` needed. The List renders instantly.

## Implementation Notes

- Use `Intl.DateTimeFormat` with `timeZone` option for all conversions
- Use `Intl.DateTimeFormat().resolvedOptions().timeZone` to detect the user's local timezone
- The `dayOffset` is computed by comparing the date portion of source and target
- System locale determines 12h vs 24h formatting by default, but always show 24h in the main display for clarity
- Favorite timezone preference is parsed and validated once at command load, with bad entries producing a toast warning
