# Timezone Converter — Raycast Extension Spec (v1)

## Overview

A Raycast extension that converts times between timezones. The user types a time and source timezone (e.g., `7:22 CET`) and instantly sees the conversion to their local timezone plus any configured favorite timezones.

## Requirements Summary

- **Input method**: Direct arguments in the Raycast search bar
- **Target timezones**: Local system timezone + user-configurable list of favorite timezones
- **Actions**: Copy converted time to clipboard
- **Timezone formats**: Abbreviations (CET, PST), city names (Berlin, Tokyo), and IANA identifiers (Europe/Berlin)

## Extension Manifest

```json
{
  "name": "timezone-converter",
  "title": "Timezone Converter",
  "description": "Convert times between timezones instantly. Type a time and timezone to see it in your local time and favorites.",
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
          "name": "time",
          "type": "text",
          "placeholder": "7:22",
          "required": true
        },
        {
          "name": "timezone",
          "type": "text",
          "placeholder": "CET, Berlin, Europe/Berlin",
          "required": true
        }
      ]
    }
  ],
  "preferences": [
    {
      "name": "favoriteTimezones",
      "title": "Favorite Timezones",
      "description": "Comma-separated list of timezones to always show conversions for (e.g., America/New_York, CET, Tokyo)",
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

## Command Architecture

### Single Command: `convert-time`

**Mode**: `view` — renders a List showing converted times.

**Entry point**: `src/convert-time.tsx`

**Flow**:
1. User invokes "Convert Time" command
2. Raycast prompts for two arguments: `time` and `timezone`
3. Extension parses the time string and resolves the timezone
4. Renders a `List` showing the converted time in:
   - The user's local/system timezone (first item, highlighted)
   - Each favorite timezone from preferences
5. Each list item has `Action.CopyToClipboard` as the primary action

### Input Parsing

**Time formats accepted**:
- `7:22` or `07:22` (24-hour)
- `7:22 PM` or `7:22pm` (12-hour)
- `19:22` (24-hour)

**Timezone resolution** (checked in order):
1. IANA identifier exact match: `Europe/Berlin`, `America/New_York`
2. Common abbreviation lookup: `CET` → `Europe/Berlin`, `PST` → `America/Los_Angeles`, `IST` → `Asia/Kolkata`
3. City name fuzzy match: `Berlin` → `Europe/Berlin`, `New York` → `America/New_York`, `KL` → `Asia/Kuala_Lumpur`

## UI Design

```
┌─────────────────────────────────────────────┐
│ Convert Time                                │
├─────────────────────────────────────────────┤
│                                             │
│ 🏠 Local (Asia/Kuala_Lumpur)               │
│    11:52 MYT                    +8:00  ⏎   │
│                                             │
│ 🌍 America/New_York                        │
│    23:52 EST                    -5:00  ⏎   │
│                                             │
│ 🌍 Europe/Berlin                           │
│    05:52 CET                    +1:00  ⏎   │
│                                             │
└─────────────────────────────────────────────┘
```

### List Component Structure

```tsx
<List>
  <List.Section title="Converted Times">
    <List.Item
      title="11:52 MYT"
      subtitle="Asia/Kuala_Lumpur"
      icon={Icon.House}
      accessories={[
        { text: "UTC+8:00" },
        { tag: { value: "Local", color: Color.Green } }
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Time" content="11:52 MYT" />
          <Action.CopyToClipboard
            title="Copy Time Only"
            content="11:52"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
    {/* ... favorite timezone items ... */}
  </List.Section>
</List>
```

## Data Layer

### Timezone Resolution Map

A static map bundled with the extension mapping:
- **Abbreviations** → IANA identifiers (e.g., `CET` → `Europe/Berlin`)
- **City names** → IANA identifiers (e.g., `Tokyo` → `Asia/Tokyo`)

This avoids external API calls — all conversion is local using JavaScript's `Intl.DateTimeFormat` with timezone support.

### Core Conversion Logic

```typescript
function convertTime(
  timeStr: string,
  sourceTimezone: string,
  targetTimezone: string
): ConvertedTime {
  // 1. Parse timeStr into hours/minutes
  // 2. Resolve sourceTimezone to IANA identifier
  // 3. Create a Date object for today at the given time in the source timezone
  // 4. Format the Date in the target timezone using Intl.DateTimeFormat
  // Return { time: "11:52", abbreviation: "MYT", utcOffset: "+8:00", ianaId: "Asia/Kuala_Lumpur" }
}
```

**No external dependencies needed** — Node.js `Intl` API handles all timezone math natively.

### Type Definitions

```typescript
interface ConvertedTime {
  time: string;          // "11:52"
  time24: string;        // "11:52"
  time12: string;        // "11:52 AM"
  abbreviation: string;  // "MYT"
  utcOffset: string;     // "+08:00"
  ianaId: string;        // "Asia/Kuala_Lumpur"
  isLocal: boolean;      // true if this is the user's system timezone
}

interface TimezoneMapping {
  abbreviation: string;  // "CET"
  ianaId: string;        // "Europe/Berlin"
  cities: string[];      // ["Berlin", "Paris", "Rome"]
}
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid time format | Toast: "Invalid time format. Use HH:MM (e.g., 7:22 or 7:22 PM)" |
| Unrecognized timezone | Toast: "Unknown timezone: {input}. Try CET, Berlin, or Europe/Berlin" |
| Ambiguous abbreviation (e.g., IST) | Show all matches (India, Israel, Ireland) as separate list items |
| No favorites configured | Only show local timezone conversion |

## Empty & Loading States

- **No loading state needed**: All computation is local and instant
- **Error state**: Show `List.EmptyView` with helpful message if parsing fails

## Actions

| Action | Shortcut | Description |
|--------|----------|-------------|
| Copy Time | `Enter` (default) | Copies formatted time (e.g., "11:52 MYT") |
| Copy Time Only | `Cmd+Shift+C` | Copies just the time (e.g., "11:52") |

## File Structure

```
timezone-converter/
  package.json
  tsconfig.json
  src/
    convert-time.tsx       # Main command component
    lib/
      parse-time.ts        # Time string parsing
      resolve-timezone.ts  # Timezone name/abbrev/city → IANA resolution
      convert.ts           # Core conversion using Intl API
      timezone-data.ts     # Static mapping of abbreviations and cities
    types.ts               # Shared type definitions
  assets/
    extension-icon.png     # 512x512 extension icon
```
