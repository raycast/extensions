# Menu-bar surface

Status: resolved
Type: prototype
Blocked by: 01

## Question

What should the Raycast menu-bar command show and do, given the refresh-cadence constraints found by **Raycast menu-bar command limits**?

Build a rough prototype (stub menu-bar command or sketch) to react to. Resolve:

- Icon + title text: exactly what text (e.g. rolling-window usage % like omarchy's pill) and which icon; what it shows when data is stale/missing.
- Dropdown contents when clicked: the three windows with counts/progress, top catalog models, picks?, force-refresh item, "Open full view" item, error affordances.
- Refresh policy given the cadence the research found: how often it re-fetches, whether refresh happens on-open or on a schedule, and interaction with the full command's data/cache (shared or separate?).
- Which window/metric the primary text tracks (rolling 5h vs monthly) and whether it's user-configurable.

Link the prototype as an asset from this ticket.

## Context

The failure-mode UX matrix (no-key / bad-key / no-entitlement / offline) is decided in **Auth and key handling** (issues/05) — the pill is always rendered (`--` when unconfigured); implement that here, don't re-decide it.

## Answer

Prototype: `.scratch/opencode-usage/prototype/menu-bar-prototype.html`. Human decided:

- **Pill = icon-only**: the OpenCode logo as a menu-bar template image, **no text**. Always rendered (per the Auth and key handling matrix, the icon is still present when unconfigured and the dropdown shows the no-key setup item).
- **Click → dropdown = the full Catalog-first view** (as decided in **Raycast UI layout**): Go limits rows with progress bars + reset countdowns; model catalog sorted by quota with **two-line rows** — model name full-width, and a wrapping second line with modality + cost + `~N req/5h` + pick tag — so names are never truncated by the tag cluster; `other (N)` fold; actions: Force refresh, Open full view, Open Extension Preferences.
- **Refresh policy**: the menu-bar command refreshes on a **60s background interval and on every click**; both surfaces share **one cached payload** (LocalStorage) so offline shows the same last-known data and nothing double-fetches.
- **Constraint noted**: a `MenuBarExtra` dropdown renders *menu items*, not a list — so the full view is expressed as menu rows here, and the rich command remains the "Open full view" target.

Rejected: text-bearing pills (**A Minimal**, **B Windows-forward**) — the user wants no text in the menu bar.
