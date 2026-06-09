# 10. Promo Demotion & Intra-Tier Date Sort

## Status

Accepted

Related: refines the severity model from
[0002](0002-severity-recalibration-and-sections.md) and
[0008](0008-configurable-extra-severity-keywords.md), and the ordering from
[0001](0001-secnews-raycast-plugin.md).

## Date

2026-06-09

## Context

Two issues from real use:

1. **Promotional false positive (bug a93).** "Beyond the Zero-Day: See Your
   Network Like an Attacker | Webinar with HD Moore" was classified 🔴 Critical —
   the title-gated exploit signal (`zero-day`) fired on a webinar headline. Promo
   content is not incident reporting.
2. **Ordering (feature 7s5).** Within a tier, items were ordered by matched-signal
   count, then date. Users want each category ordered by date (newest first),
   while the categories stay ordered by criticality.

## Decision

### Promo demotion (`lib/score.ts`)

Add `PROMO_SIGNALS` (`webinar`, `whitepaper`, `white paper`, `e-book`, `ebook`,
`register now`, `register today`, `sign up`, `sponsored`, `on-demand`,
`on demand`, `livestream`, `live stream`). When a **title** matches a promo
signal, the title-gated Critical path is suppressed:

```
const promo = has(title, PROMO_SIGNALS);
if ((has(title, EXPLOIT_SIGNALS) && !promo) || has(full, extra.critical)
    || (has(full, RCE_SIGNALS) && has(full, UNAUTH_SIGNALS))) return "critical";
```

User-defined `extra.critical` keywords and the RCE+unauth combo still apply
(trusted / rare). Promo demotion only affects the **Critical** gate; the item
still falls through to High/Medium/Low on its other signals. Scope is limited to
Critical, where the noise was reported.

### Intra-tier date sort (`lib/fetch.ts`)

Sort the merged list by **severity rank, then published date (newest first)**
instead of by score:

```
items.sort((a, b) => RANK[b.severity] - RANK[a.severity] || b.publishedAt - a.publishedAt);
```

Tiers stay ordered critical → high → medium → low; within each tier items are
strictly newest-first. Items with no date (`publishedAt === 0`) sort last in
their tier. The `score` field is still computed and shown in the detail view but
no longer drives ordering.

## Consequences

- **Easier:** Critical holds real reporting; each tier reads chronologically.
- **Harder:** promo detection is keyword-based and may miss creative phrasings;
  intra-tier match-strength is no longer reflected in order.
- **Invariants:** promo never forces a tier; it only blocks the Critical gate.
  Tier order is always by criticality; within a tier, by date.
