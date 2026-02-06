# Review Feedback — Timezone Converter Spec v2

## Issue 1: Query parsing needs more robustness for multi-word city names

The parsing strategy says "split on whitespace" but city names like "New York" or "Kuala Lumpur" contain spaces. The parser needs to handle multi-word timezone inputs gracefully.

**Recommendation**: After extracting the time token(s), treat the remaining string (up to `to` or end) as the source timezone. Use a greedy match against the city name map — try the longest possible match first. For example, "New York" should match before "New". This is a parsing detail but should be explicit in the spec since it's a common input.

## Issue 2: Source timezone shown in results is unnecessary clutter

The UI mockup shows the source timezone as a list item (e.g., "07:22 CET — Europe/Berlin (source)"). But the user already knows what they typed — showing it back is redundant and adds noise.

**Recommendation**: Don't show the source timezone as a separate list item. The section title already shows the source (`7:22 CET`). Only show conversion targets: local, explicit target, and favorites. Exception: if the source timezone is different from all targets (i.e., it's not local, not in favorites, and no explicit target matches it), it's fine to omit it entirely.

## Issue 3: Accessories array filter is awkward

The code sample uses `.filter((a) => Object.keys(a).length > 0)` to remove empty accessory objects. This is a code smell.

**Recommendation**: Build the accessories array conditionally using a simple helper or inline conditionals. Something like:

```tsx
const accessories = [
  { text: `UTC${result.utcOffset}` },
  ...(result.isLocal ? [{ tag: { value: "Local", color: Color.Green } }] : []),
  ...(result.dayOffset !== 0 ? [{ tag: { value: dayLabel, color: Color.Orange } }] : []),
];
```

## Issue 4: Timezone data size estimate is vague

"~40 abbreviations, ~80 city names" — this should be more specific. How are these selected? What about less common but still useful timezones?

**Recommendation**: Define a clear selection criteria: all IANA timezones that represent a unique offset (excluding aliases like "US/Eastern" → "America/New_York"). For abbreviations, include the ~30 most commonly used worldwide. For cities, include all cities that appear as the city portion of an IANA identifier (the part after the `/`). This gives comprehensive coverage without bloat.

## Issue 5: 24h time display is opinionated

The spec says "always show 24h in the main display for clarity." But users in the US strongly prefer 12h format. Forcing 24h is a poor UX choice.

**Recommendation**: Follow the system locale for time formatting. Use `Intl.DateTimeFormat` with no explicit `hour12` option — it will automatically use the user's system preference. If needed, the user can always see both formats via the two copy actions.

## Issue 6: Missing keyboard shortcut for "Copy All"

When showing multiple timezone conversions, users might want to copy all results at once (e.g., for pasting into a message: "7:22 CET = 11:52 MYT = 1:22 AM EST").

**Recommendation**: Add a third action: "Copy All Conversions" with `Cmd+Shift+A` that formats all results into a single copyable string.

## Summary

v2 is much improved — single argument, cleaner file structure, day boundary handling. The remaining issues are refinements: multi-word city parsing, removing redundant source display, following system locale for time format, and adding a "copy all" convenience action. These are mostly detail-level fixes that tighten the UX.
