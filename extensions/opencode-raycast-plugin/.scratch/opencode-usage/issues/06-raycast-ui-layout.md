# Raycast UI layout

Status: resolved
Type: prototype
Blocked by: 03

## Question

How should the full Raycast command lay out the OpenCode Go view, given the component capabilities from **Raycast extension scaffold and store conventions**?

Build a cheap, rough prototype (stub UI or component sketch) to react to. It should resolve:

- Command structure: one main command or several (e.g. separate "Go limits" / "Catalog" / "Picks" commands vs one command with sections)? Search/filter behavior?
- How each surface renders: limit windows as rows with progress + reset countdown (accessoryTitle/icons?), the model catalog sorted by cost/quota/name with $/M pricing and "other" folding, and picks placement.
- Detail view vs pure list; markdown Detail for per-model or window drill-down, or skip.
- Actions: force refresh, open opencode.ai/go, open Extension Preferences, copy a value.
- What the empty/error/loading states look like (deferred detail to **Auth and key handling**'s outcomes).

Link the prototype as an asset from this ticket.

## Context

The failure-mode UX matrix (no-key / bad-key / no-entitlement / offline) is decided in **Auth and key handling** (issues/05) — implement its error/empty/loading states here, don't re-decide them.

## Answer

Prototype: `.scratch/opencode-usage/prototype/ui-layout-prototype.html` (3 variants, `?variant=A|B|C`). Human chose **C (Catalog-first)** as built.

**Winning layout — Catalog-first, single command:**
- One list command; models own the screen, default sort by quota (req/5h desc).
- The three **limit windows** collapse into a pinned header row of chips, each chip = window name + used % + small progress bar + reset countdown.
- Each model row: title = model id (excluded models flagged "(excluded)"); **subtitle = modality as plain text** (`in text, image · out text`); **accessory = cost tag ($X/M / $Y/M) + `~N req/5h` tag**; pick models get an inline Stretch / Value tag.
- Picks are tagged inline on their model rows (no separate picks section).
- Rows past `maxModels` fold into "… and N more models (folded)".
- **Modality** (input/output text, image, video, audio) comes from `models.dev` `modalities.input/output` — same fetch the pricing already uses; rendered as text, not icons.
- **Actions**: force refresh, open Extension Preferences, copy a model's price, open the model page in the browser.
- **Error/empty/loading states**: per the **Auth and key handling** failure matrix (no-key / bad-key(401) / no-entitlement(403) / offline-keeps-last-known).

Rejected variants: **A (Sections)** — balanced limits→picks→catalog, dropped for C's model-first density; **B (Dashboard)** — markdown summary home, dropped for keeping catalog a push-away. Kept as primary source on the throwaway branch.
