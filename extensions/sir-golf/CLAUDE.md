# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Raycast extension (TypeScript + React) showing live golf leaderboards, season rankings, and the tour schedule. Hard constraints that shape every decision: **$0 recurring cost, no backend, no API key, no AI calls.** All data comes from ESPN's *unofficial* public golf JSON API, fetched client-side and cached by Raycast. See `VALIDATION.md` for the Phase 0 data spike that proved this is viable and documents the endpoints.

## Commands

```bash
npm run dev        # ray develop — builds in watch mode and pushes into the Raycast app (needs Raycast.app)
npm run build      # ray build -e dist — validates + builds
npm run lint       # ray lint — ESLint + Prettier + manifest validation
npm run fix-lint   # ray lint --fix — autofix formatting/lint
npx tsc --noEmit   # type-check without the Raycast CLI
```

There is **no test framework**. Data-layer changes are verified by running throwaway probes against the live API: `npx tsx spike/probe.ts` (and `probe2..5.ts`). When changing `src/espn.ts`, write a quick `spike/*.ts` that imports the changed function and run it with `npx tsx` to confirm shapes against real ESPN responses before wiring UI.

`ray lint` gotchas: it enforces Prettier formatting (run `fix-lint`), Title Case on action titles (avoid `title="Open on ESPN"` → "ESPN" trips it; prefer the default `<Action.OpenInBrowser />`), and that `package.json` `author` is a real Raycast username and `categories` are from Raycast's allowed list.

## Architecture

**`src/espn.ts` is the entire data layer** — all fetching, parsing, and normalization. UI files contain no fetch logic; they call exported `get*` functions via `useCachedPromise`/`useFetch`. Understand this file first.

Two ESPN hosts:
- `site.api.espn.com/.../{tour}/scoreboard` — one cheap (~37 KB) call returns the current leaderboard **and** the full season calendar (`leagues[0].calendar`). Both Leaderboard and Golf Season ride on this. **Never use `?dates=YYYY` for the current season** — it's a 17 MB payload; it's only used (deliberately) for past-season browsing.
- `sports.core.api.espn.com` (CORE) — HATEOAS; fields are `{ $ref }` links resolved on demand. Used for event detail (venue/course/purse/defending champ/winner), season leaders (scoring average, FedEx Cup…), and athlete bios/headshots/stats.

Tours are `pga | lpga | eur` (`TourId`); Golf Season also supports `"all"` (`TourSel`) to merge all three chronologically.

Key design patterns to preserve:
- **Graceful fallback**: `getLeaderboard` shows the live event if one is running (`state: "in"`, auto-refreshed every 30s), otherwise falls back to the most recent *completed* event — never a blank screen.
- **Lazy, per-selection detail fetches**: side panes (`PlayerDetailPane`, the event detail in `golf-season.tsx`) only fetch for the *selected* row, gated by `execute: active && !!id` in `useCachedPromise`. Selection is tracked via the list's `onSelectionChange`. Do not fetch detail for every row.
- **Fail soft**: every API field is optional; parsers default missing values, individual athlete-ref resolutions are wrapped in try/catch.

Commands (in `package.json` `commands`, each a `src/<name>.tsx` default export):
- `leaderboard` — unified view; the dropdown switches between "This Tournament" (live board) and season ranking categories (`LEADERBOARD_VIEWS`).
- `golf-season` — schedule with a year dropdown (current + past seasons with winners), defaults to "All Tours" combined.
- `rankings-menu` — `menu-bar` mode; current leader + scoring-average + FedEx leaders.

`src/player-detail.tsx` is the shared player side pane used by Leaderboard (and reused patterns elsewhere).

## Data gaps (confirmed, don't re-investigate)

- **No per-tournament logos** in ESPN's golf feed — the tour/league logo is used instead. Player country flags and headshots do exist.
- **No tee/qualifying times** — the golf `summary` endpoint returns 502.
- **Broadcast data is US/PGA-only** from ESPN. Non-US "where to watch" comes from `WATCH_GUIDE` in `src/espn.ts` — a hand-maintained local table (Sky, Canal+, etc.), clearly labeled in-UI as a general guide. Edit that constant to extend regions.
- **No OWGR / world ranking** available for free — out of scope.
- **No major-championship flag** — ESPN's feed has no "major" field. Majors are detected by name in `majorLabelOf(name, tour)` (`src/espn.ts`), scoped per tour so flagship-but-not-major events (DP World Tour's *BMW PGA Championship*, the *CPKC Women's Open*) don't false-positive. The 4 men's majors ride the `pga` feed, the 5 women's majors ride `lpga`, `eur` carries none. Edit the matcher to adjust. Badged in Golf Season (star accessory + Type tag) and Leaderboard (`⛳` title prefix).
- The `DEP0040 punycode` deprecation line during `npm run dev` is emitted by Raycast's own app process (`Raycast Helper (Extensions)`), not this project — it is not fixable from here and is harmless.

## Conventions

- Keep all fetching in `src/espn.ts`; UI files stay declarative.
- **Add to Calendar** (Golf Season, ⌘⇧A): `buildEventIcs` in `src/espn.ts` emits an all-day VEVENT; the UI writes it to `environment.supportPath` and `open()`s it so the OS calendar imports it — no backend, honouring the $0 constraint.
- `spike/` holds throwaway probes + the icon generator — kept as documentation, not part of the built extension (only `src/*.tsx` are entry points).
- Do **not** open the Raycast Store PR or run `npm run publish` without explicit instruction — store screenshots (`metadata/`) and a final review are a human step.
