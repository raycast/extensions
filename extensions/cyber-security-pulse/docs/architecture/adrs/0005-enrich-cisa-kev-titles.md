# 5. Enrich Generic CISA KEV Titles

## Status

Accepted

Related: builds on [0001](0001-secnews-raycast-plugin.md) (fetch pipeline).

## Date

2026-06-03

## Context

CISA KEV feed items all share a generic title ("CISA Adds One/Two/Three Known
Exploited Vulnerabilities to Catalog"). The actual vulnerabilities — product and
CVE — sit in the body as clean lines, e.g.:

```
CVE-2022-0492 Linux Kernel Improper Authentication Vulnerability
CVE-2025-48595 Android Framework Integer Overflow Vulnerability
```

The generic title carries no scannable signal. The user wants the affected
products/CVEs surfaced in the list title.

## Decision

Add a title-enrichment step in `lib/fetch.ts`, applied during item mapping
**before** scoring:

- Detect KEV-add items by title (`/known exploited vulnerab/i`).
- Parse the (untruncated) plain-text body for `CVE-YYYY-NNNN <description>`
  entries, where the description runs up to the next CVE or the boilerplate
  sentence ("These types…", "This type…", "Binding Operational…").
- Strip a trailing "Vulnerability"/"Vulnerabilities" from each description.
- Rewrite the title as `CISA KEV: <desc> (<CVE>); <desc> (<CVE>)`, capped at 3
  entries with `+N more` when there are more.
- If no CVE entries parse, keep the original title.

Enrichment runs before `scoreItem`; KEV items remain critical via the
"known exploited" signal in the body regardless of the title rewrite.

## Consequences

- **Easier:** KEV rows are now scannable (which products/CVEs were added).
- **Harder:** the parser is tuned to CISA's current body format; a format change
  degrades gracefully to the original title.
- **Invariants:** enrichment only rewrites the display title, never severity;
  non-KEV items are untouched.
