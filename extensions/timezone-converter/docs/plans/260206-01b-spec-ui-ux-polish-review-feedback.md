# Review Feedback: UI/UX Polish Spec — Iteration B

**Reviewer:** Architecture Skill (Self-Review)
**Date:** 2026-02-06

---

## Positive

1. **Sentinel removal is clean.** Empty state is now handled at the component level, not inside `parseQuery`.
2. **Reverse conversion via Action.Push is much better.** Avoids locale round-trip issues and gives natural back-navigation.
3. **Action.Paste correctly removed.** Matches user preferences.
4. **Cmd+Shift+R avoids conflict with Common.Refresh.** Good catch from iteration A feedback.
5. **`formatIanaId` handles multi-segment IDs.** The `Indiana / Indianapolis` case is now covered.
6. **Adding hours/minutes to ConvertedTime** is a clean approach for enabling reverse conversion.

---

## Remaining Issues

### 1. ReverseConversionView Receives Wrong Data

The `ReverseConversionView` takes `hours` and `minutes` — but these need to be the hours/minutes **in the target timezone** (the one we're reversing from). The spec says `ConvertedTime` will expose `hours` and `minutes`, which represent the converted time in the target timezone. This is correct. However, the prop naming `sourceIanaId` in the reverse view is confusing — in the reverse context, the "source" is what was the "target" in the original query.

**Fix:** The code logic is correct but add a brief comment in the implementation clarifying the reversal semantics.

### 2. `formatTime` Export Dependency

The spec mentions exporting `formatTime` from `timezone-utils.ts` for use in `ReverseConversionView`. Need to verify that `formatTime` takes `(hours, minutes)` as parameters. Looking at the codebase analysis, `formatTime` uses Intl.DateTimeFormat and takes `(hours, minutes)` — so this should work. Just confirm during implementation.

### 3. Minor: ConversionItem Component Not Defined

The pseudocode in Section 2 references `<ConversionItem>` but Section 3 shows the implementation inline as `<List.Item>`. This is fine — the spec is clear enough that during implementation it can be either inline or extracted. No action needed, just noting the inconsistency.

### 4. Minor: Section Title Could Be More Descriptive

The section title `"7:22 CET"` is minimal. Consider adding a subtle arrow or the word "from" to make it clearer: `"From 7:22 CET"` or `"7:22 CET →"`. This helps the user quickly understand the direction of conversion.

**Suggestion:** Use `"7:22 CET →"` — concise and directional.

### 5. Missing: What Happens When User Types Just a Number

Currently `parseQuery("7")` would fail because there's no timezone. But with the search bar, users will naturally type incrementally: "7" → "7:" → "7:2" → "7:22" → "7:22 " → "7:22 C" → "7:22 CE" → "7:22 CET".

Each intermediate state would show the error EmptyView, which is fine for most states. But the error message needs to be helpful for partial input, not alarming. The current error messages like "Missing source timezone" or "Invalid time format" are appropriate.

However, consider: should we suppress the error view entirely while the user is still typing? With `throttle` on, there's a natural delay. The current behavior (show error for incomplete input) is acceptable — it acts as real-time feedback about what's missing. No change needed.

### 6. Missing: Consider `isLoading` During Initial Render

Even though computation is synchronous, there may be a brief flash on the first render. Setting `isLoading={!trimmed}` would hide the EmptyView during the very first frame. Actually, `List.EmptyView` is not shown while `isLoading={true}`, so this would prevent the user from seeing the helpful empty state. **Do NOT set isLoading.** The current approach is correct.

---

## Verdict

This iteration is solid. The remaining issues are minor (comment clarity, section title arrow). The spec is ready for a final polish pass.

**Recommended changes for iteration C:**
1. Add `" →"` to section title for directional clarity
2. Add implementation comment about reversal semantics
3. Clean up the pseudocode inconsistency (ConversionItem vs inline)
4. Final check: ensure no Raycast API misuse
