# Spec: UI/UX Polish for Timezone Converter

**Date:** 2026-02-06
**Iteration:** A (First Draft)
**Branch:** `better-ui-ux`

## Requirements Summary

Improve the UI/UX of the timezone converter extension to feel more polished and native to Raycast. Key changes:

1. **Switch from command argument to live search bar input** — type in the search bar and see results update in real-time
2. **Add a helpful empty state** with format hints and usage examples when no query is entered
3. **Add "Reverse Conversion" action** — swap source/target and see the inverse
4. **Keep the clean list layout** (no detail panel) but polish accessories, icons, and visual hierarchy
5. **General visual polish** — better font usage, consistent icons, clearer information hierarchy

## Clarifications

- Input shifts from `arguments` to `searchText` on the List component with `filtering={false}`
- The command argument should be removed from `package.json` (no more `arguments` array)
- Reverse conversion should use `Action.Push` to navigate to a new list with swapped source/target
- Empty state shows curated examples that users can learn from
- Favorites and preferences remain unchanged

---

## 1. Extension Manifest Changes

### package.json

Remove the `arguments` array from the command definition since we're switching to search-bar input:

```json
{
  "commands": [
    {
      "name": "convert-time",
      "title": "Convert Time",
      "description": "Convert a time from one timezone to your local timezone and favorites",
      "mode": "view"
    }
  ],
  "preferences": [
    {
      "name": "favoriteTimezones",
      "title": "Favorite Timezones",
      "description": "Comma-separated list of timezones to always display (e.g., \"America/New_York, CET, Tokyo\")",
      "type": "textfield",
      "required": false,
      "placeholder": "America/New_York, CET, Tokyo"
    }
  ]
}
```

**Rationale:** Removing `arguments` eliminates the upfront modal input. The search bar provides a more fluid, forgiving experience where users see results as they type.

---

## 2. Command Architecture

### Entry Point: `src/convert-time.tsx`

**Mode:** `view` (renders a List)

**Component Flow:**

```
ConvertTime
├── State: searchText (string)
├── Parse searchText via parseQuery()
├── If searchText is empty → show EmptyView with examples
├── If parseQuery returns error → show EmptyView with error + hints
├── If valid → compute conversions → render List.Items
└── ActionPanel on each item:
    ├── Action.CopyToClipboard (default — copies "7:22 PM CET")
    ├── Action.Paste (pastes time into frontmost app)
    ├── Action.CopyToClipboard "Copy Time Only" (copies "7:22 PM")
    ├── Action "Reverse Conversion" → push new view with swapped tz
    └── Action.CopyToClipboard "Copy All" (copies all conversions)
```

### LaunchProps

Since we remove `arguments`, the component signature simplifies:

```typescript
export default function ConvertTime() {
  const [searchText, setSearchText] = useState("");
  // ...
}
```

However, we should still support `launchContext` or `fallbackText` for deep linking / Quicklinks if a user wants to invoke with a pre-filled query:

```typescript
export default function ConvertTime(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  // ...
}
```

---

## 3. UI Design

### Search Bar

```typescript
<List
  filtering={false}
  onSearchTextChange={setSearchText}
  searchText={searchText}
  searchBarPlaceholder="e.g. 7:22 CET, 3pm PST to EST, 14:00 Tokyo"
  throttle
>
```

- **`filtering={false}`** — we handle all filtering/parsing ourselves
- **`throttle`** — prevents excessive re-renders while typing
- **Placeholder** — shows example formats directly in the search bar

### Empty State (No Query)

When `searchText` is empty, show a friendly guide:

```typescript
<List.EmptyView
  title="Convert Time Across Timezones"
  description={`Try typing:\n• 7:22 CET\n• 3pm PST to EST\n• 14:00 Tokyo\n• 11 IST`}
  icon={Icon.Clock}
/>
```

### Error State (Invalid Query)

When parsing fails, show a helpful error:

```typescript
<List.EmptyView
  title="Couldn't parse your input"
  description={`${parsed.error}\n\nFormat: TIME TIMEZONE [to TARGET]\nExamples: 7:22 CET, 3pm PST to EST`}
  icon={Icon.ExclamationMark}
/>
```

### Results List

**Section title format:** `"7:22 CET"` (source time + source label, clean and readable)

**List.Item structure for each converted timezone:**

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
    // Day offset (if not same day)
    ...(result.dayOffset !== 0
      ? [{ tag: { value: result.dayOffset > 0 ? "+1 day" : "-1 day", color: Color.Orange } }]
      : []),
    // UTC offset
    { text: { value: `UTC${result.utcOffset}`, color: Color.SecondaryText } },
    // Local indicator
    ...(result.isLocal ? [{ tag: { value: "Local", color: Color.Green } }] : []),
  ]}
  actions={...}
/>
```

**Visual improvements over current:**
- Blue-tinted house icon for local timezone (was plain icon)
- SecondaryText-colored globe for non-local (less visual noise)
- Better subtitle: format IANA IDs to be human-readable (`America/New_York` → `New York`)
- Accessories ordered: day offset → UTC offset → Local tag (most important info rightmost)

### Helper: `formatIanaId`

Convert raw IANA IDs to readable labels:

```typescript
function formatIanaId(ianaId: string): string {
  // "America/New_York" → "New York"
  // "Asia/Kuala_Lumpur" → "Kuala Lumpur"
  const city = ianaId.split("/").pop() ?? ianaId;
  return city.replace(/_/g, " ");
}
```

---

## 4. Action Design

### ActionPanel per List.Item

```typescript
<ActionPanel>
  {/* Primary action: copy formatted time with timezone */}
  <Action.CopyToClipboard
    title="Copy Time"
    content={`${result.formattedTime} ${result.abbreviation}`}
  />

  {/* Paste directly into frontmost app */}
  <Action.Paste
    title="Paste Time"
    content={`${result.formattedTime} ${result.abbreviation}`}
    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
  />

  {/* Copy just the time without timezone */}
  <Action.CopyToClipboard
    title="Copy Time Only"
    content={result.formattedTime}
    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
  />

  {/* Reverse conversion */}
  <Action
    title="Reverse Conversion"
    icon={Icon.Switch}
    shortcut={{ modifiers: ["cmd"], key: "r" }}
    onAction={() => {
      setSearchText(`${result.formattedTime} ${result.abbreviation} to ${sourceLabel}`);
    }}
  />

  {/* Copy all conversions */}
  <Action.CopyToClipboard
    title="Copy All Conversions"
    content={allConversionsString}
    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
  />
</ActionPanel>
```

**Action ordering rationale:**
1. **Copy Time** (default/first) — most common action, triggered by Enter
2. **Paste Time** — second most common, puts result directly into target app
3. **Copy Time Only** — for when you don't need the timezone label
4. **Reverse Conversion** — less common but very useful
5. **Copy All** — bulk operation, least frequently used

**Reverse Conversion approach:** Instead of `Action.Push` (which would create a navigation stack), simply update the `searchText` state to the reversed query. This feels more natural — the user sees the search bar update and results re-render in place. No navigation stack to manage.

---

## 5. Data Layer Changes

### parseQuery adjustments

The `parseQuery` function remains unchanged in its core logic. However, we need to handle the empty string case gracefully (return early, no error) since the search bar starts empty:

```typescript
export function parseQuery(query: string): ParsedQuery {
  const trimmed = query.trim();
  if (!trimmed) {
    return { timeStr: "", hours: 0, minutes: 0, sourceTimezone: "", sourceLabel: "", error: "__empty__" };
  }
  // ... rest of existing logic
}
```

We use a sentinel `"__empty__"` error to distinguish "user hasn't typed yet" from "user typed something invalid."

### No other data layer changes needed

- `convertTime`, `resolveTimezone`, `getTargetTimezones` all remain the same
- Timezone data maps remain the same
- Favorite timezone handling remains the same

---

## 6. Type Definitions

No new types needed. The existing `ParsedQuery` and `ConvertedTime` interfaces are sufficient.

One small addition — a constant for the empty sentinel:

```typescript
export const EMPTY_QUERY = "__empty__";
```

---

## 7. Error & Loading States

### Loading State

Since all computation is synchronous (no API calls), we don't need a loading state. The `isLoading` prop on `<List>` stays at its default `false`.

### Error States

| Scenario | UI |
|----------|-----|
| Empty search bar | EmptyView with format examples |
| Invalid time format | EmptyView with error message + format hints |
| Unknown timezone | EmptyView with "Unknown timezone: X" + supported format hints |
| Invalid favorites | Warning toast at mount (existing behavior, keep it) |

### Edge Cases

- **Ambiguous abbreviations** (e.g., "IST"): Continue showing all interpretations as separate items — this is a feature, not a bug
- **Same source/target**: Skip duplicates (existing behavior)
- **Very long favorite lists**: Natural scrolling, no pagination needed

---

## 8. Keyboard Shortcut Summary

| Action | Shortcut | Context |
|--------|----------|---------|
| Copy Time | Enter (default) | Primary action on any item |
| Paste Time | Cmd+Shift+V | Paste into frontmost app |
| Copy Time Only | Cmd+Shift+C | Copy without timezone label |
| Reverse Conversion | Cmd+R | Swap source/target |
| Copy All Conversions | Cmd+Shift+A | Copy all results |

---

## 9. Migration Notes

### Breaking Changes

- **Removed:** Command `arguments` — users who have Quicklinks using the old argument format will need to update them
- **Added:** `fallbackText` support so Quicklinks/deep links can pre-fill the search bar

### Backwards Compatibility

The parsing logic itself is unchanged, so any query that worked before will produce the same results. Only the input mechanism changes.

---

## 10. File Changes Summary

| File | Change |
|------|--------|
| `package.json` | Remove `arguments` array from command |
| `src/convert-time.tsx` | Rewrite to use search bar, new empty state, new actions |
| `src/timezone-utils.ts` | Add `EMPTY_QUERY` constant, handle empty string in `parseQuery` |
| `src/timezone-data.ts` | No changes |
