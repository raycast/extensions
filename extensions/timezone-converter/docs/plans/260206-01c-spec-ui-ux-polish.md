# Spec: UI/UX Polish for Timezone Converter (FINAL)

**Date:** 2026-02-06
**Iteration:** C (Final)
**Branch:** `better-ui-ux`

---

## Overview

Polish the timezone converter extension to feel native to Raycast by switching from upfront command arguments to a live search bar, adding helpful empty/error states with format guidance, improving visual hierarchy with tinted icons and ordered accessories, and adding a reverse conversion action.

---

## 1. Manifest Changes (`package.json`)

Remove the `arguments` array from the `convert-time` command:

```diff
 {
   "name": "convert-time",
   "title": "Convert Time",
   "description": "Convert a time from one timezone to your local timezone and favorites",
-  "mode": "view",
-  "arguments": [
-    {
-      "name": "query",
-      "placeholder": "7:22 CET or 7:22 CET to PST",
-      "type": "text",
-      "required": true
-    }
-  ]
+  "mode": "view"
 }
```

Preferences remain unchanged.

---

## 2. Main Component (`src/convert-time.tsx`)

### Component Structure

```typescript
import { List, Action, ActionPanel, Icon, Color, Toast, showToast, getPreferenceValues, LaunchProps } from "@raycast/api";
import { useState, useEffect } from "react";
import { parseQuery, convertTime, getTargetTimezones, getInvalidFavorites, formatTime, ParsedQuery, ConvertedTime } from "./timezone-utils";

export default function ConvertTime(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { favoriteTimezones } = getPreferenceValues<Preferences>();

  // Warn about invalid favorites on mount
  useEffect(() => {
    const invalid = getInvalidFavorites(favoriteTimezones);
    if (invalid.length > 0) {
      showToast({ style: Toast.Style.Warning, title: "Skipping unknown timezone(s)", message: invalid.join(", ") });
    }
  }, []);

  const trimmed = searchText.trim();

  // --- Empty state ---
  if (!trimmed) {
    return (
      <SearchList searchText={searchText} onSearchTextChange={setSearchText}>
        <List.EmptyView
          title="Convert Time Across Timezones"
          description={"Try typing:\n• 7:22 CET\n• 3pm PST to EST\n• 14:00 Tokyo\n• 11 IST"}
          icon={Icon.Clock}
        />
      </SearchList>
    );
  }

  // --- Parse input ---
  const parsed = parseQuery(trimmed);

  if (parsed.error) {
    return (
      <SearchList searchText={searchText} onSearchTextChange={setSearchText}>
        <List.EmptyView
          title="Couldn't parse your input"
          description={`${parsed.error}\n\nFormat: TIME TIMEZONE [to TARGET]\nExamples: 7:22 CET, 3pm PST to EST`}
          icon={Icon.ExclamationMark}
        />
      </SearchList>
    );
  }

  // --- Compute conversions ---
  const targets = getTargetTimezones(parsed, favoriteTimezones);
  const results = targets.map(t =>
    convertTime(parsed.hours, parsed.minutes, parsed.sourceTimezone, t.ianaId, t.label)
  );
  const allConversionsStr = results.map(r => `${r.formattedTime} ${r.abbreviation}`).join(" = ");

  return (
    <SearchList searchText={searchText} onSearchTextChange={setSearchText}>
      <List.Section title={`${parsed.timeStr} ${parsed.sourceLabel} →`}>
        {results.map(result => (
          <List.Item
            key={result.ianaId + (result.label ?? "")}
            icon={{
              source: result.isLocal ? Icon.House : Icon.Globe,
              tintColor: result.isLocal ? Color.Blue : Color.SecondaryText,
            }}
            title={`${result.formattedTime} ${result.abbreviation}`}
            subtitle={result.label || formatIanaId(result.ianaId)}
            accessories={[
              ...(result.isLocal ? [{ tag: { value: "Local", color: Color.Green } }] : []),
              ...(result.dayOffset !== 0
                ? [{ tag: { value: result.dayOffset > 0 ? "+1 day" : "-1 day", color: Color.Orange } }]
                : []),
              { text: { value: `UTC${result.utcOffset}`, color: Color.SecondaryText } },
            ]}
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
                <Action.Push
                  title="Reverse Conversion"
                  icon={Icon.Switch}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  target={
                    <ReverseConversionView
                      hours={result.hours}
                      minutes={result.minutes}
                      sourceIanaId={result.ianaId}
                      sourceLabel={result.abbreviation}
                    />
                  }
                />
                <Action.CopyToClipboard
                  title="Copy All Conversions"
                  content={allConversionsStr}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </SearchList>
  );
}
```

### SearchList Wrapper

Extract the common List props into a thin wrapper to avoid repetition across empty/error/results states:

```typescript
function SearchList({
  searchText,
  onSearchTextChange,
  children,
}: {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  children: React.ReactNode;
}) {
  return (
    <List
      filtering={false}
      onSearchTextChange={onSearchTextChange}
      searchText={searchText}
      searchBarPlaceholder="e.g. 7:22 CET or 3pm PST to EST"
      navigationTitle="Convert Time"
      throttle
    >
      {children}
    </List>
  );
}
```

### ReverseConversionView

Pushed via `Action.Push`. Computes the reverse conversion directly from numeric hours/minutes — no text round-trip parsing.

```typescript
// The "source" here is the timezone we're converting FROM in the reverse direction.
// i.e., what was a TARGET in the original query becomes the SOURCE here.
function ReverseConversionView({
  hours,
  minutes,
  sourceIanaId,
  sourceLabel,
}: {
  hours: number;        // hours in this timezone (the target from original query)
  minutes: number;      // minutes in this timezone
  sourceIanaId: string; // IANA ID of this timezone
  sourceLabel: string;  // abbreviation of this timezone
}) {
  const { favoriteTimezones } = getPreferenceValues<Preferences>();

  const reverseParsed: ParsedQuery = {
    timeStr: formatTime(hours, minutes),
    hours,
    minutes,
    sourceTimezone: sourceIanaId,
    sourceLabel,
  };

  const targets = getTargetTimezones(reverseParsed, favoriteTimezones);
  const results = targets.map(t =>
    convertTime(hours, minutes, sourceIanaId, t.ianaId, t.label)
  );

  return (
    <List navigationTitle={`${sourceLabel} → Conversions`}>
      <List.Section title={`${formatTime(hours, minutes)} ${sourceLabel} →`}>
        {results.map(result => (
          <List.Item
            key={result.ianaId + (result.label ?? "")}
            icon={{
              source: result.isLocal ? Icon.House : Icon.Globe,
              tintColor: result.isLocal ? Color.Blue : Color.SecondaryText,
            }}
            title={`${result.formattedTime} ${result.abbreviation}`}
            subtitle={result.label || formatIanaId(result.ianaId)}
            accessories={[
              ...(result.isLocal ? [{ tag: { value: "Local", color: Color.Green } }] : []),
              ...(result.dayOffset !== 0
                ? [{ tag: { value: result.dayOffset > 0 ? "+1 day" : "-1 day", color: Color.Orange } }]
                : []),
              { text: { value: `UTC${result.utcOffset}`, color: Color.SecondaryText } },
            ]}
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

No recursive reverse action in this view — keeps the navigation stack shallow.

### Helper: `formatIanaId`

```typescript
function formatIanaId(ianaId: string): string {
  const parts = ianaId.split("/");
  parts.shift(); // remove continent (e.g., "America")
  return parts.map(p => p.replace(/_/g, " ")).join(" / ");
}
```

Examples: `America/New_York` → `New York`, `America/Indiana/Indianapolis` → `Indiana / Indianapolis`

---

## 3. Data Layer Changes (`src/timezone-utils.ts`)

### 3a. Add `hours` and `minutes` to `ConvertedTime`

```typescript
export interface ConvertedTime {
  ianaId: string;
  abbreviation: string;
  formattedTime: string;
  utcOffset: string;
  dayOffset: number;
  isLocal: boolean;
  label?: string;
  hours: number;    // 0-23, time in target timezone
  minutes: number;  // 0-59, time in target timezone
}
```

In the `convertTime` function, the target hours and minutes are already computed as part of the conversion — expose them in the return value.

### 3b. Export `formatTime`

Ensure `formatTime(hours: number, minutes: number): string` is exported so `ReverseConversionView` can use it for the section title.

### 3c. No changes to `parseQuery`

Empty string handling stays in the component. `parseQuery` continues to return an error for truly invalid input.

---

## 4. No Changes to `src/timezone-data.ts`

---

## 5. Keyboard Shortcuts

| Action | Shortcut | View |
|--------|----------|------|
| Copy Time | Enter (default) | Main + Reverse |
| Copy Time Only | Cmd+Shift+C | Main + Reverse |
| Reverse Conversion | Cmd+Shift+R | Main only |
| Copy All Conversions | Cmd+Shift+A | Main only |
| Go Back | Esc | Reverse view |

---

## 6. Error & Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| Empty search bar | EmptyView with Clock icon + 4 format examples |
| Partial input (e.g., "7:22") | EmptyView with "Missing source timezone" + format hints |
| Invalid time (e.g., "25:00 CET") | EmptyView with "Hour must be 0-23" + format hints |
| Unknown timezone (e.g., "7:22 XYZ") | EmptyView with "Unknown timezone: XYZ" + format hints |
| Ambiguous abbreviation (e.g., "9 IST") | Shows all interpretations as separate items |
| Invalid favorites in preferences | Warning toast at mount, invalid ones skipped |
| Source = local timezone | Local item still shown (with "Local" tag), no duplication |

---

## 7. File Changes Summary

| File | Type | Description |
|------|------|-------------|
| `package.json` | Edit | Remove `arguments` array from command |
| `src/convert-time.tsx` | Rewrite | Search bar input, SearchList wrapper, empty/error states, ConversionActions, ReverseConversionView, formatIanaId |
| `src/timezone-utils.ts` | Edit | Add `hours`/`minutes` to ConvertedTime; export `formatTime` |
| `src/timezone-data.ts` | None | No changes |

---

## 8. Visual Summary

### Before
- Modal argument popup → type full query → Enter → see results
- Plain uncolored icons
- Raw IANA ID subtitles
- No guidance for input format
- Error shows only a message, no hints

### After
- Live search bar → type and see results instantly
- Blue house icon for local, muted globe for others
- Human-readable location subtitles
- Helpful empty state with 4 format examples
- Error state includes format hints
- Directional section title ("7:22 CET →")
- Reverse conversion via Cmd+Shift+R with back navigation
- Accessories ordered by signal: Local → day offset → UTC offset
