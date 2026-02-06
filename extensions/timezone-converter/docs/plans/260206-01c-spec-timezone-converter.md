# Timezone Converter — Raycast Extension Spec (v3 — Final)

## Overview

A Raycast extension that converts times between timezones. The user types a natural query like `7:22 CET` into a single argument and instantly sees the conversion to their local timezone, any explicitly targeted timezone, and configured favorites.

## Requirements

- **Input**: Single text argument — `7:22 CET` or `7:22 CET to PST`
- **Output**: List of converted times (local first, then explicit target, then favorites)
- **Timezone formats**: Abbreviations, city names, IANA identifiers
- **Actions**: Copy individual time, copy time only, copy all conversions
- **Zero external deps**: All conversion via native `Intl` API
- **Time display**: Follows system locale (12h or 24h based on user's macOS settings)

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

### Format

```
<time>[am|pm] <source_timezone> [to <target_timezone>]
```

### Examples

| Input | Time | Source | Explicit Target |
|-------|------|--------|-----------------|
| `7:22 CET` | 07:22 | Europe/Berlin | — |
| `7:22pm PST to CET` | 19:22 | America/Los_Angeles | Europe/Berlin |
| `19:22 Europe/Berlin` | 19:22 | Europe/Berlin | — |
| `3:00 Tokyo to New York` | 03:00 | Asia/Tokyo | America/New_York |
| `11:30am KL` | 11:30 | Asia/Kuala_Lumpur | — |

### Parsing Algorithm

1. **Extract time**: Match the leading time pattern: `(\d{1,2}):(\d{2})\s*(am|pm)?`
2. **Find "to" separator**: Scan remaining string for ` to ` (case-insensitive, word-bounded)
3. **Source timezone**: Everything between the time and `to` (or end of string), trimmed
4. **Target timezone** (optional): Everything after `to`, trimmed
5. **Resolve timezones**: Use greedy matching against the timezone map — try longest possible string first to handle multi-word names like "New York" or "Kuala Lumpur"

### Time Formats Accepted

- `7:22` — assumes 24-hour
- `07:22` — 24-hour with leading zero
- `7:22pm` or `7:22 PM` — 12-hour (case-insensitive, with or without space)
- `19:22` — explicit 24-hour

## Timezone Resolution

### Resolution Order

1. **Exact IANA match**: Input matches a known IANA identifier (e.g., `Europe/Berlin`)
2. **Abbreviation lookup**: Input matches a timezone abbreviation (e.g., `CET`)
3. **City/region name**: Input matches a city or common name (e.g., `Berlin`, `KL`, `New York`)

All matching is case-insensitive.

### Ambiguous Abbreviations

Some abbreviations (IST, CST, BST, etc.) map to multiple timezones. When ambiguous:
- Show conversions for **all** matching timezones as separate list items
- Label each with the full timezone name: "IST (India Standard Time)", "IST (Israel Standard Time)"
- Sort by geographic proximity to user's local timezone (nearest UTC offset first)

### Timezone Data Scope

**Selection criteria**:
- All unique IANA timezone identifiers (excluding deprecated aliases like `US/Eastern`)
- ~30 common abbreviations (covering all major abbreviations worldwide)
- City names extracted from IANA identifiers (the part after `/`, with `_` replaced by space) plus common short forms:
  - `NY` → `America/New_York`
  - `LA` → `America/Los_Angeles`
  - `KL` → `Asia/Kuala_Lumpur`
  - `SF` → `America/Los_Angeles`

This data lives in a single `timezone-data.ts` file as a static map.

## UI Design

### List Layout

```
┌───────────────────────────────────────────────────────┐
│ Convert Time: 7:22 CET                                │
├───────────────────────────────────────────────────────┤
│                                                       │
│  🏠  11:52 AM MYT                UTC+8 · Local        │
│     Asia/Kuala_Lumpur                                 │
│                                                       │
│  🌐  1:22 AM EST                 UTC-5 · +1 day       │
│     America/New_York                                  │
│                                                       │
│  🌐  8:22 AM IST                 UTC+5:30             │
│     Asia/Kolkata                                      │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Result Ordering

1. **Local timezone** — always first, House icon, green "Local" tag
2. **Explicit target** — if `to <timezone>` was used, Globe icon
3. **Favorite timezones** — from preferences, in configured order, Globe icon
4. **Deduplication**: If local or explicit target also appears in favorites, skip the duplicate

### Component Structure

```tsx
export default function ConvertTime(
  props: LaunchProps<{ arguments: { query: string } }>
) {
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

  const targets = getTargetTimezones(parsed);
  const results = targets.map((tz) =>
    convertTime(parsed.hours, parsed.minutes, parsed.sourceTimezone, tz)
  );

  const allConversionsText = results
    .map((r) => `${r.formattedTime} ${r.abbreviation}`)
    .join(" = ");

  return (
    <List>
      <List.Section title={`${parsed.timeStr} ${parsed.sourceLabel}`}>
        {results.map((result) => (
          <List.Item
            key={result.ianaId + (result.label || "")}
            icon={result.isLocal ? Icon.House : Icon.Globe}
            title={`${result.formattedTime} ${result.abbreviation}`}
            subtitle={result.label || result.ianaId}
            accessories={buildAccessories(result)}
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
                <Action.CopyToClipboard
                  title="Copy All Conversions"
                  content={allConversionsText}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function buildAccessories(result: ConvertedTime): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [
    { text: `UTC${result.utcOffset}` },
  ];
  if (result.isLocal) {
    accessories.push({ tag: { value: "Local", color: Color.Green } });
  }
  if (result.dayOffset !== 0) {
    const label = result.dayOffset > 0 ? `+${result.dayOffset} day` : `${result.dayOffset} day`;
    accessories.push({ tag: { value: label, color: Color.Orange } });
  }
  return accessories;
}
```

## Core Types

```typescript
interface ParsedQuery {
  timeStr: string;           // Original time portion: "7:22"
  hours: number;             // 7  (always in 24h: 0-23)
  minutes: number;           // 22 (0-59)
  sourceTimezone: string;    // Resolved IANA id: "Europe/Berlin"
  sourceLabel: string;       // Original input: "CET"
  targetTimezone?: string;   // Resolved IANA id if "to X" was used
  error?: string;            // Parse error message, if invalid
}

interface ConvertedTime {
  ianaId: string;            // "Asia/Kuala_Lumpur"
  abbreviation: string;      // "MYT"
  formattedTime: string;     // "11:52 AM" or "11:52" depending on system locale
  utcOffset: string;         // "+08:00"
  dayOffset: number;         // 0 = same day, +1 = next day, -1 = previous day
  isLocal: boolean;          // true for user's system timezone
  label?: string;            // Optional disambiguation: "IST (India Standard Time)"
}
```

## Actions

| Action | Shortcut | Content |
|--------|----------|---------|
| Copy Time | `Enter` (default) | `11:52 AM MYT` |
| Copy Time Only | `Cmd+Shift+C` | `11:52 AM` |
| Copy All Conversions | `Cmd+Shift+A` | `11:52 AM MYT = 1:22 AM EST = 8:22 AM IST` |

## Error Handling

| Scenario | UX |
|----------|-----|
| Invalid time (`25:00`, `abc`) | `List.EmptyView`: "Invalid time format" with hint "Use HH:MM, e.g., 7:22 or 7:22pm" |
| Unknown timezone | `List.EmptyView`: "Unknown timezone: {input}" with hint "Try CET, Berlin, or Europe/Berlin" |
| Invalid favorite in preferences | Toast warning: "Skipping unknown timezone: {value}" — valid favorites still shown |
| Empty query | `List.EmptyView`: usage instructions showing example inputs |

## Conversion Logic

All conversion uses the native `Intl` API — no timezone libraries needed.

```typescript
function convertTime(
  hours: number,
  minutes: number,
  sourceIana: string,
  targetIana: string
): ConvertedTime {
  // 1. Create a reference date (today) in UTC
  // 2. Use Intl.DateTimeFormat with timeZone=sourceIana to find the UTC offset of the source
  // 3. Calculate the actual UTC time: given time - source offset
  // 4. Use Intl.DateTimeFormat with timeZone=targetIana to format the UTC time in the target
  // 5. Compare dates to determine dayOffset
  // 6. Extract abbreviation from Intl.DateTimeFormat with timeZoneName: "short"
}
```

**Key implementation detail**: To convert "7:22 in CET" to another timezone:
1. Create a Date for today at 7:22 UTC
2. Find CET's offset from UTC (+1:00)
3. Adjust: the actual UTC time is 6:22 (7:22 - 1:00)
4. Format 6:22 UTC in the target timezone using `Intl.DateTimeFormat`

**System locale**: Use `Intl.DateTimeFormat()` without specifying `hour12` — the browser/Node will use the system's locale preference automatically.

**Local timezone detection**: `Intl.DateTimeFormat().resolvedOptions().timeZone` returns the system IANA timezone.

## File Structure

```
src/
  convert-time.tsx       # Command: UI rendering, action panel
  timezone-utils.ts      # parseQuery(), convertTime(), resolveTimezone(), getTargetTimezones()
  timezone-data.ts       # Static maps: abbreviations, city names → IANA identifiers
```

## No Loading State

All computation is local and synchronous (pure `Intl` calls). No `isLoading` prop needed. The list renders instantly after the user submits their query.

## Favorite Timezone Validation

On command load:
1. Read `favoriteTimezones` preference
2. Split by comma, trim each entry
3. Resolve each through the same `resolveTimezone()` function used for the main query
4. If any entry fails to resolve, show a single Toast: `"Skipping unknown timezone(s): {list}"`
5. Continue with the valid entries

## Project Initialization

Use `pnpm` to initialize the Raycast extension:
```bash
pnpm init
pnpm add @raycast/api @raycast/utils
pnpm add -D @raycast/eslint-config @types/node @types/react eslint prettier typescript
```

Configure `tsconfig.json` per Raycast conventions with `"jsx": "react-jsx"` and strict mode.
