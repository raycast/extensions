# Review Feedback: UI/UX Polish Spec — Iteration A

**Reviewer:** Architecture Skill (Self-Review)
**Date:** 2026-02-06

---

## Positive

1. **Search bar approach is correct.** Moving from arguments to `onSearchTextChange` with `filtering={false}` and `throttle` is the right Raycast pattern for custom parsing.
2. **Empty state with examples is user-friendly.** Showing format hints when the search bar is empty is standard Raycast practice.
3. **Action ordering follows Raycast conventions.** Most common action first (Enter to copy), destructive/less-common actions further down.
4. **No over-engineering.** The spec keeps the existing data layer intact and only changes what's needed.

---

## Issues to Address

### 1. Sentinel Error Value is Fragile

Using `"__empty__"` as a sentinel string in the `error` field of `ParsedQuery` is a code smell. It conflates "no input" with "parse error." The component should check `searchText.trim() === ""` directly, before even calling `parseQuery`. Don't make `parseQuery` responsible for the "nothing typed yet" state.

**Fix:** Remove the sentinel. Have the component guard on empty search text before calling `parseQuery`.

### 2. Reverse Conversion UX — Setting searchText Directly is Janky

Setting `setSearchText(...)` to the reverse query has a UX problem: the user's cursor is now at the end of a pre-filled query they didn't type. If they try to edit it, it feels foreign. Also, `result.formattedTime` may include locale-specific formatting (e.g., "7:22 PM") which may not match the parsing regex if the user's locale uses 24h format. The formatted time round-trip isn't guaranteed to parse correctly.

**Fix:** Instead of composing a text query, compute the reverse directly. Create a helper `reverseConversion(hours, minutes, targetIanaId, sourceIanaId)` that returns conversions without needing to parse text. Use `Action.Push` to show the reversed results as a new view — this is cleaner and avoids the round-trip parsing issue. The Push navigation also makes the back-button work naturally (Cmd+[ to go back).

### 3. Missing `Action.Paste`

The user didn't select "Paste into frontmost app" in the clarification questions — they only selected "Reverse conversion." The spec includes `Action.Paste` anyway. Remove it to match user preferences and keep the action panel lean.

**Fix:** Remove `Action.Paste` from the spec.

### 4. `formatIanaId` Should Handle Edge Cases

The helper only takes the last segment after `/`, but some IANA IDs have three parts (e.g., `America/Indiana/Indianapolis`, `America/Argentina/Buenos_Aires`). The simple `.split("/").pop()` would return just "Indianapolis" or "Buenos_Aires" which loses context.

**Fix:** Take everything after the first `/` and replace underscores: `America/New_York` → `New York`, `America/Indiana/Indianapolis` → `Indiana / Indianapolis`.

### 5. Accessories Order — "Local" Tag Should Be First, Not Last

The spec puts the "Local" tag rightmost. In Raycast, accessories render left-to-right, and the rightmost items are closest to the edge. The "Local" tag is high-signal — it tells you which result is your timezone. It should be the first accessory (leftmost, closest to the subtitle) for scannability. UTC offset is reference info and can be further right.

**Fix:** Reorder accessories: Local tag → day offset → UTC offset.

### 6. Search Bar Placeholder Is Too Long

`"e.g. 7:22 CET, 3pm PST to EST, 14:00 Tokyo"` is quite long and may get truncated in narrow Raycast windows. Keep it shorter and let the EmptyView show the full examples.

**Fix:** Shorten to `"e.g. 7:22 CET or 3pm PST to EST"`.

### 7. Missing `fallbackText` Support Documentation

The spec mentions `props.fallbackText` for deep linking but doesn't explain how Raycast's fallbackText works. It's passed when the user types text in Raycast's root search that matches the command but includes extra text. This is a good feature to support.

**Fix:** Keep the `fallbackText` support but add a note explaining when it fires.

### 8. No `navigationTitle` Set

The List should set `navigationTitle` so the Raycast window title reflects the extension context:

```typescript
<List navigationTitle="Convert Time" ... >
```

### 9. Cmd+R Conflicts with Raycast's Common.Refresh

`Cmd+R` is `Keyboard.Shortcut.Common.Refresh` in Raycast's common shortcuts. Using it for "Reverse Conversion" would conflict with users' expectations. Choose a different shortcut.

**Fix:** Use `Cmd+Shift+R` for reverse, or `Cmd+T` (for "toggle"/"transpose").

---

## Summary

The core architecture is sound. The main changes needed are:
1. Remove sentinel error pattern — guard empty state in component
2. Fix reverse conversion to use `Action.Push` with direct computation (no text round-trip)
3. Remove `Action.Paste` (user didn't request it)
4. Fix `formatIanaId` for multi-segment IANA IDs
5. Reorder accessories for scannability
6. Shorten search bar placeholder
7. Add `navigationTitle`
8. Fix Cmd+R shortcut conflict
