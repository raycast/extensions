# Review Feedback — Timezone Converter Spec v1

## Issue 1: Two separate arguments is clunky UX

The spec uses two required arguments (`time` and `timezone`), which means Raycast will show two sequential prompts. This defeats the "type and go" feel the user described ("7:22 CET" as a single phrase).

**Recommendation**: Use a single text argument where the user types the full query (e.g., "7:22 CET"). Parse the time and timezone from one string. This matches how the user naturally described the interaction.

## Issue 2: Over-engineered file structure

Six files in `src/lib/` for what is fundamentally a single parse-and-convert operation is too many abstractions. This is a focused Raycast extension, not a library.

**Recommendation**: Collapse to two files max — the command file and a single `timezone-utils.ts` module containing parsing, resolution, and conversion. Only split if a file exceeds ~200 lines.

## Issue 3: Ambiguous timezone handling is under-specified

The spec says "show all matches" for ambiguous abbreviations like IST, but doesn't explain how the user picks the right one. Showing India, Israel, and Ireland all at once without context could be confusing.

**Recommendation**: Show all matches clearly labeled with the region/country, and let the user select the right one. The first item should be a best-guess based on the user's local timezone proximity or most common usage.

## Issue 4: Missing "today vs tomorrow" context

When converting `23:00 PST` to `Asia/Kuala_Lumpur`, the result is the next day. The spec doesn't address day boundaries.

**Recommendation**: Show "+1 day" or the actual date when the conversion crosses a day boundary. Add this to the `ConvertedTime` type and render it as an accessory tag.

## Issue 5: Favorite timezones preference is fragile

A comma-separated textfield for favorite timezones is error-prone. Users might type invalid values or use inconsistent formats.

**Recommendation**: Keep the textfield approach (Raycast doesn't support multi-select preferences), but add validation on first use and show a toast if any timezone in the list can't be resolved. Also support the same flexible input as the main command (abbreviations, cities, IANA).

## Issue 6: Types are slightly redundant

`ConvertedTime` has both `time`, `time24`, and `time12`. Just store the Date and format on render.

**Recommendation**: Store the resolved Date object and the target IANA timezone. Format to 24h/12h at render time based on system locale, reducing type complexity.

## Issue 7: No "to" syntax support

The user said "multi-target" but the spec only supports local + favorites. What if someone wants `7:22 CET to PST` as a one-off conversion?

**Recommendation**: Support optional "to <timezone>" syntax in the single argument. If present, show that target timezone first (before favorites). If absent, show local + favorites as currently designed.

## Summary

The core concept is solid — local-only computation using `Intl`, simple List UI, copy actions. The main issues are UX friction (two arguments instead of one), over-engineering (too many files), and missing edge cases (day boundaries, ambiguous timezones, ad-hoc target). Fix these and the spec is tight.
