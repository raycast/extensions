# 2. Severity Recalibration (4 Tiers) and Sectioned List

## Status

Accepted

Related: builds on [0001](0001-secnews-raycast-plugin.md).

## Date

2026-06-02

## Context

Live testing of ADR-0001 showed nearly every item ranked 🔴 critical. Two
defects in the additive scoring model:

1. **Keyword summing inflates fast.** A normal security headline ("Critical RCE
   vulnerability exploited") stacks multiple keyword hits (each title hit ×2)
   well past the red threshold of 10.
2. **`critical` is a near-universal headline word**, so it fired the high tier on
   almost everything.

The user asked to (a) reserve red for genuinely critical items, (b) add a yellow
tier, and (c) group items with drill-down in Raycast.

## Decision

### Severity model: highest matched tier wins (no summing)

Replace the additive sum with rule-based classification. Each item is matched
against tier signal sets; the **highest** matched tier sets the severity. Keyword
counts only break ties for sort order — they never escalate a tier.

Four tiers (`lib/types.ts` `Severity` becomes a 4-value union):

- **🔴 critical** — gated. Set only when EITHER:
  - an active-exploitation signal is present
    (`actively exploited`, `exploited in the wild`, `in the wild`,
    `under active attack`, `zero-day`, `0-day`, `wormable`,
    `exploitation observed`), OR
  - a critical unauthenticated RCE: an RCE signal (`remote code execution`,
    `rce`) AND an unauth signal (`unauthenticated`, `pre-auth`,
    `without authentication`, `no authentication`).
- **🟠 high** — strong but not red: `ransomware`, `backdoor`, `supply chain`,
  `cvss 9`, `cvss 10`, `rce`, `privilege escalation`, `data breach`,
  `critical` (+ `vulnerability`/`flaw`), `exploit`/`poc`.
- **🟡 medium** — routine vuln/patch: `vulnerability`, `flaw`, `patch`,
  `security update`, `advisory`, `cve-`.
- **⚪ low** — no signal matched.

### Score for ordering

`scoreItem` still returns `{ score, severity }`. Score = `severityBase`
(low 0, medium 100, high 200, critical 300) + match-count bonus (title hits ×2),
so the global sort (`score desc, publishedAt desc`) keeps tiers contiguous and
orders sensibly within a tier.

### UI: two-level drill-down

Initially shipped as a sectioned single list; after live testing the user chose
the two-level drill-down instead. `latest-news.tsx` top-level `List` shows one
row per non-empty tier (emoji + label, item count accessory, chevron). Enter
pushes a `TierList` containing just that tier's items, which in turn push the
`NewsDetail` preview. Item accessories (source tag, relative date) unchanged. A
dropdown filter remains available as a follow-up.

## Consequences

- **Easier:** red now means "act now"; tiers are meaningful; sections give an
  at-a-glance triage view.
- **Harder:** signal sets are still heuristic and English-only; combination rule
  (RCE + unauth) depends on both phrases appearing in title/summary, which feeds
  don't always include.
- **Follow-up:** if sections feel cramped, switch to two-level drill-down or a
  severity dropdown (both scoped in ADR-0001 brainstorm).
- **Invariants:** severity is the highest matched tier, never a sum; red is gated
  behind exploit/unauth-RCE signals. If summing creeps back in, revisit.
