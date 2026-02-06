# Spec: UI/UX Polish for Timezone Converter

**Date:** 2026-02-06
**Iteration:** B (Second Draft — Feedback Applied)
**Branch:** `better-ui-ux`

## Requirements Summary

Improve the UI/UX of the timezone converter extension to feel more polished and native to Raycast:

1. **Switch from command argument to live search bar** — type and see results update in real-time
2. **Helpful empty state** with format hints and usage examples
3. **Reverse Conversion action** via `Action.Push` with direct computation
4. **Visual polish** — better icons, accessories, information hierarchy
5. **Shorter, cleaner search bar placeholder**

---

## 1. Extension Manifest Changes

### package.json

Remove `arguments` from the command. No other manifest changes.

```jsonc
{
  "commands": [
    {
      "name": "convert-time",
      "title": "Convert Time",
      "description": "Convert a time from one timezone to your local timezone and favorites",
      "mode": "view"
      // arguments: REMOVED
    }
  ]
  // preferences: unchanged
}
```

---

## 2. Command Architecture

### Entry Point: `src/convert-time.tsx`

```typescript
export default function ConvertTime(props: LaunchProps) {
  // fallbackText: text typed in Raycast root search that matched this command
  // e.g., user types "convert time 7:22 CET" in root → fallbackText = "7:22 CET"
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");

  // Validate favorites once on mount (existing behavior)
  useEffect(() => {
    const { favoriteTimezones } = getPreferenceValues<Preferences>();
    const invalid = getInvalidFavorites(favoriteTimezones);
    if (invalid.length > 0) {
      showToast({ style: Toast.Style.Warning, title: "Skipping unknown timezone(s)", message: invalid.join(", ") });
    }
  }, []);

  const trimmed = searchText.trim();

  // Empty state: show format examples
  if (!trimmed) {
    return (
      <List ...searchBarProps>
        <List.EmptyView
          title="Convert Time Across Timezones"
          description={"Try typing:\n• 7:22 CET\n• 3pm PST to EST\n• 14:00 Tokyo\n• 11 IST"}
          icon={Icon.Clock}
        />
      </List>
    );
  }

  const parsed = parseQuery(trimmed);

  // Parse error state
  if (parsed.error) {
    return (
      <List ...searchBarProps>
        <List.EmptyView
          title="Couldn't parse your input"
          description={`${parsed.error}\n\nFormat: TIME TIMEZONE [to TARGET]\nExamples: 7:22 CET, 3pm PST to EST`}
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  // Valid: compute and render results
  const targets = getTargetTimezones(parsed, favoriteTimezones);
  const results = targets.map(t => convertTime(parsed.hours, parsed.minutes, parsed.sourceTimezone, t.ianaId, t.label));

  return (
    <List ...searchBarProps>
      <List.Section title={`${parsed.timeStr} ${parsed.sourceLabel}`}>
        {results.map(result => <ConversionItem key={...} result={result} parsed={parsed} allResults={results} setSearchText={setSearchText} />)}
      </List.Section>
    </List>
  );
}
```

Where `...searchBarProps` is shorthand for:
```typescript
filtering={false}
onSearchTextChange={setSearchText}
searchText={searchText}
searchBarPlaceholder="e.g. 7:22 CET or 3pm PST to EST"
navigationTitle="Convert Time"
throttle
```

---

## 3. UI Design

### Search Bar

```typescript
<List
  filtering={false}
  onSearchTextChange={setSearchText}
  searchText={searchText}
  searchBarPlaceholder="e.g. 7:22 CET or 3pm PST to EST"
  navigationTitle="Convert Time"
  throttle
>
```

- `filtering={false}` — custom parsing, not Raycast's built-in filter
- `throttle` — debounce rapid keystrokes
- Short placeholder that fits comfortably in the search bar

### Empty State (No Query)

```typescript
<List.EmptyView
  title="Convert Time Across Timezones"
  description={"Try typing:\n• 7:22 CET\n• 3pm PST to EST\n• 14:00 Tokyo\n• 11 IST"}
  icon={Icon.Clock}
/>
```

### Error State (Parse Failure)

```typescript
<List.EmptyView
  title="Couldn't parse your input"
  description={`${parsed.error}\n\nFormat: TIME TIMEZONE [to TARGET]\nExamples: 7:22 CET, 3pm PST to EST`}
  icon={Icon.ExclamationMark}
/>
```

### Result Items

Each `List.Item` for a converted timezone:

```typescript
<List.Item
  key={result.ianaId + (result.label ?? "")}
  icon={{
    source: result.isLocal ? Icon.House : Icon.Globe,
    tintColor: result.isLocal ? Color.Blue : Color.SecondaryText,
  }}
  title={`${result.formattedTime} ${result.abbreviation}`}
  subtitle={result.label || formatIanaId(result.ianaId)}
  accessories={[
    // Local indicator (leftmost — high signal, easy to scan)
    ...(result.isLocal ? [{ tag: { value: "Local", color: Color.Green } }] : []),
    // Day offset (if crossing day boundary)
    ...(result.dayOffset !== 0
      ? [{ tag: { value: result.dayOffset > 0 ? "+1 day" : "-1 day", color: Color.Orange } }]
      : []),
    // UTC offset (rightmost — reference info)
    { text: { value: `UTC${result.utcOffset}`, color: Color.SecondaryText } },
  ]}
  actions={<ConversionActions result={result} parsed={parsed} allResults={results} />}
/>
```

### Helper: `formatIanaId`

Handles multi-segment IANA IDs correctly:

```typescript
function formatIanaId(ianaId: string): string {
  // "America/New_York" → "New York"
  // "America/Indiana/Indianapolis" → "Indiana / Indianapolis"
  const parts = ianaId.split("/");
  parts.shift(); // remove continent
  return parts.map(p => p.replace(/_/g, " ")).join(" / ");
}
```

---

## 4. Action Design

### ActionPanel: `ConversionActions`

```typescript
function ConversionActions({
  result,
  parsed,
  allResults,
}: {
  result: ConvertedTime;
  parsed: ParsedQuery;
  allResults: ConvertedTime[];
}) {
  const allConversionsStr = allResults
    .map(r => `${r.formattedTime} ${r.abbreviation}`)
    .join(" = ");

  return (
    <ActionPanel>
      {/* 1. Primary: Copy time with timezone (Enter) */}
      <Action.CopyToClipboard
        title="Copy Time"
        content={`${result.formattedTime} ${result.abbreviation}`}
      />

      {/* 2. Copy just the time */}
      <Action.CopyToClipboard
        title="Copy Time Only"
        content={result.formattedTime}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />

      {/* 3. Reverse conversion */}
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
            originalSourceLabel={parsed.sourceLabel}
          />
        }
      />

      {/* 4. Copy all conversions as one line */}
      <Action.CopyToClipboard
        title="Copy All Conversions"
        content={allConversionsStr}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      />
    </ActionPanel>
  );
}
```

**Action ordering:**
1. **Copy Time** (Enter) — most common action
2. **Copy Time Only** (Cmd+Shift+C) — common variant
3. **Reverse Conversion** (Cmd+Shift+R) — avoids conflict with `Common.Refresh` on Cmd+R
4. **Copy All** (Cmd+Shift+A) — bulk action, least common

---

## 5. Reverse Conversion View

Instead of manipulating `searchText` (which causes round-trip parsing issues with locale-formatted times), use `Action.Push` to push a self-contained view that computes the reverse directly.

### Component: `ReverseConversionView`

```typescript
function ReverseConversionView({
  hours,
  minutes,
  sourceIanaId,
  sourceLabel,
  originalSourceLabel,
}: {
  hours: number;        // hours in the target timezone (what we're reversing from)
  minutes: number;      // minutes in the target timezone
  sourceIanaId: string; // IANA ID of the timezone we're reversing from
  sourceLabel: string;  // abbreviation of the timezone we're reversing from
  originalSourceLabel: string; // original source timezone label (now becomes target)
}) {
  const { favoriteTimezones } = getPreferenceValues<Preferences>();

  // Build a ParsedQuery-like object for the reverse direction
  const reverseParsed: ParsedQuery = {
    timeStr: formatTime(hours, minutes),
    hours,
    minutes,
    sourceTimezone: sourceIanaId,
    sourceLabel,
    targetTimezone: undefined, // show all favorites + local
  };

  const targets = getTargetTimezones(reverseParsed, favoriteTimezones);
  const results = targets.map(t =>
    convertTime(hours, minutes, sourceIanaId, t.ianaId, t.label)
  );

  return (
    <List navigationTitle={`${sourceLabel} → Conversions`}>
      <List.Section title={`${formatTime(hours, minutes)} ${sourceLabel}`}>
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

**Why Action.Push instead of searchText manipulation:**
- Avoids locale-formatted time → parse regex round-trip failures
- Back button (Esc / Cmd+[) works naturally to return to original results
- The reversed view is read-only (no search bar needed) — it's a computed result
- No recursive chaining — the reverse view has copy actions but no further reverse action

**Data needed for reverse:** The `ConvertedTime` type doesn't currently expose `hours` and `minutes` as numbers. We need to add these to `ConvertedTime` so the reverse view can compute correctly without re-parsing formatted strings.

---

## 6. Type Changes

### `ConvertedTime` — add numeric hours/minutes

```typescript
interface ConvertedTime {
  ianaId: string;
  abbreviation: string;
  formattedTime: string;
  utcOffset: string;
  dayOffset: number;
  isLocal: boolean;
  label?: string;
  hours: number;    // NEW: 0-23, hours in target timezone
  minutes: number;  // NEW: 0-59, minutes in target timezone
}
```

The `convertTime` function already computes these internally — just expose them in the return value.

---

## 7. Data Layer Changes

### `timezone-utils.ts`

1. **`convertTime`** — add `hours` and `minutes` to the return object:
   ```typescript
   return {
     ...existing,
     hours: targetHours,   // already computed internally
     minutes: targetMinutes, // already computed internally
   };
   ```

2. **`parseQuery`** — no changes. Empty string handling stays in the component.

3. **`formatTime`** — export this function (currently may be private) so `ReverseConversionView` can use it for the section title.

### `timezone-data.ts`

No changes.

---

## 8. Error & Loading States

| Scenario | UI |
|----------|-----|
| Empty search bar | EmptyView with Clock icon + format examples |
| Invalid time format | EmptyView with ExclamationMark + error + format hints |
| Unknown timezone | EmptyView with error + format hints |
| Invalid favorites | Warning toast at mount (unchanged) |
| No results (dedup removed all) | Shouldn't happen — local always included |

No loading state needed — all computation is synchronous.

---

## 9. Keyboard Shortcut Summary

| Action | Shortcut | Context |
|--------|----------|---------|
| Copy Time | Enter (default) | Any result item |
| Copy Time Only | Cmd+Shift+C | Any result item |
| Reverse Conversion | Cmd+Shift+R | Any result item (main view only) |
| Copy All Conversions | Cmd+Shift+A | Any result item |
| Go Back (from reverse) | Esc | Reverse conversion view |

---

## 10. File Changes Summary

| File | Change |
|------|--------|
| `package.json` | Remove `arguments` array from `convert-time` command |
| `src/convert-time.tsx` | Rewrite: search bar input, empty state, error state, ConversionActions, ReverseConversionView, formatIanaId |
| `src/timezone-utils.ts` | Add `hours`/`minutes` to `ConvertedTime` return; export `formatTime` |
| `src/timezone-data.ts` | No changes |

---

## 11. Visual Before/After Summary

### Before (Current)
- Input via modal argument popup (type full query, press enter, then see results)
- Plain icons without tinting
- Accessories: UTC offset → Local tag → day offset (inconsistent ordering)
- Raw IANA IDs as subtitles (e.g., `America/New_York`)
- No guidance when query is wrong — just an error icon

### After (Proposed)
- Input via search bar with live results (type and see results instantly)
- Blue-tinted house icon for local, muted globe for others
- Accessories: Local tag → day offset → UTC offset (signal-ordered)
- Human-readable subtitles (e.g., `New York`)
- Helpful empty state with format examples
- Error state includes format hints alongside error message
- Reverse conversion via Cmd+Shift+R with proper back navigation
