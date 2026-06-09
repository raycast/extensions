# 8. Configurable Extra Severity Keywords

## Status

Accepted

Related: extends the severity model from
[0002](0002-severity-recalibration-and-sections.md); reuses the preference
pattern from [0004](0004-priority-watchlist.md) / [0007](0007-configurable-feeds.md).

## Date

2026-06-03

## Context

The severity signal lists were hardcoded. Users want to tune classification
without editing code — e.g. always treat news about their own vendor/product as
higher severity. The Critical tier carries special logic (title-gating + the
RCE-and-unauthenticated combo) that should not be exposed as raw replaceable
lists, or users could break it (an empty list → nothing ever critical).

## Decision

**Augment, don't replace.** Add three optional `textfield` preferences whose
keywords are *added* to the built-in tier lists; the defaults always apply.

- `extraCritical`, `extraHigh`, `extraMedium` — comma-separated keywords.

### Semantics (`lib/score.ts`)

```ts
export interface ExtraSignals { critical: string[]; high: string[]; medium: string[]; }
export function parseKeywords(raw: string): string[];
export function scoreItem(title: string, body: string, extra?: ExtraSignals): { score; severity };
```

- `classify` adds the extras to each tier check. **Extra Critical keywords match
  anywhere** (title or body), unlike the built-in title-gated exploit signals —
  user-chosen terms are trusted and should fire wherever they appear.
- `extraHigh` / `extraMedium` are added to the existing full-text checks.
- Matching keeps the word-boundary rule; `rx` now omits the leading `\b` for
  keywords starting with punctuation (e.g. `.net`, `c#`) so user terms match.
- Extras also count toward the intra-tier ordering bonus.

### Wiring

`fetchAllFeeds(feeds, extra?)` threads the extras to `scoreItem`. The command
reads the three preferences, parses them with `parseKeywords`, and keys the
cached promise on their raw strings so edits re-score:

```ts
useCachedPromise(
  (f, ec, eh, em) => fetchAllFeeds(parseFeeds(f), {
    critical: parseKeywords(ec), high: parseKeywords(eh), medium: parseKeywords(em),
  }),
  [feedsRaw ?? "", extraCritical ?? "", extraHigh ?? "", extraMedium ?? ""],
);
```

## Consequences

- **Easier:** users boost terms per tier from settings; the built-in model and
  Critical gating stay intact and unbreakable.
- **Harder:** extra-Critical matching anywhere can over-flag if a user picks a
  very common word — their choice, documented.
- **Invariants:** extras only *add* to tiers, never remove built-ins; an empty
  preference is a no-op; Critical's title-gating + RCE/unauth combo are unchanged.
