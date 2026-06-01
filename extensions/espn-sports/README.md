# ESPN Raycast Extension

Search teams and players across sports, then drill into schedules, rosters,
season stats, and per-game logs — all from a single Raycast command, powered by
[ESPN's public APIs](https://github.com/pseudo-r/Public-ESPN-API).

## Features

- **Universal search** — one command searches both teams and players across
  every sport ESPN indexes. No per-sport commands, no dropdown to fiddle with;
  just type a name.
- **Team detail** — a header with the logo, record, standing, and season,
  followed by **Upcoming Games** (date / time / opponent / venue) and
  **Recent Results** (W/L and score).
- **Roster** — the full team roster, grouped by position unit when the sport
  provides it (e.g. Offense / Defense / Special Teams), flat otherwise.
- **Player detail** — a headshot-and-bio header, a compact season-stats table,
  and a per-game log joined from ESPN's overview and gamelog endpoints.
- **Quicklinks** — save any team or player as a Raycast Quicklink (⌘⇧L). The
  link deep-links back into the command and opens straight to that detail page,
  no re-searching.

## Supported sports

The extension is **sport-agnostic by design**. Nothing is hardcoded per league —
the `sport` and `league` slugs are read from each search result and passed
through to the standard ESPN endpoints. In practice that means it works for any
league ESPN returns from search, including:

| Sport       | `sport`      | example `league`                       |
| ----------- | ------------ | -------------------------------------- |
| Football    | `football`   | `nfl`, `college-football`              |
| Basketball  | `basketball` | `nba`, `wnba`, `mens-college-basketball` |
| Baseball    | `baseball`   | `mlb`                                  |
| Hockey      | `hockey`     | `nhl`                                  |
| Soccer      | `soccer`     | `eng.1` (Premier League), `usa.1` (MLS), … |

Season stats **and** per-game logs have been verified for NFL, NBA, MLB, NHL,
and soccer. Other leagues that ESPN exposes through the same endpoints will work
the same way — see ["Adding sports"](#adding-or-extending-sports) below.

## How it works

Everything lives in `src/search-teams.tsx`; shared API response shapes are in
`src/types.ts`. The data flow:

1. **Search** —
   `GET site.web.api.espn.com/apis/search/v2?query=<text>&limit=20`
   returns groups of `team` and `player` results. Each result carries the
   `sport`, `defaultLeagueSlug`, a `uid`, a web `link`, and an `image`.

2. **Resolving numeric IDs** — ESPN's search IDs are UUIDs, but the detail
   endpoints need numeric IDs. Those live in the `uid`
   (`s:40~l:46~t:13` → team `13`, `…~a:1966` → athlete `1966`). Team web links
   have no `/_/id/` segment, so the `uid` is the only reliable source for teams;
   player links are parsed from `/_/id/<n>/` as a fallback.

3. **Team detail** —
   `GET site.api.espn.com/apis/site/v2/sports/<sport>/<league>/teams/<id>/schedule`.
   Game status is read from `competitions[0].status.type.name`
   (`STATUS_SCHEDULED` / `STATUS_FINAL*` / `STATUS_POSTPONED`) — **not** the
   event's top-level `status`, which this endpoint leaves empty.

4. **Roster** —
   `GET site.api.espn.com/apis/site/v2/sports/<sport>/<league>/teams/<id>/roster`.
   `athletes` is either a flat `RosterPlayer[]` or position groups
   (`{ position, items: RosterPlayer[] }[]`); both are handled.

5. **Player detail** — two calls under
   `site.web.api.espn.com/apis/common/v3/sports/<sport>/<league>/athletes/<id>`:
   - `…/overview` — season stats and per-game stat values.
   - `…/gamelog` — per-game metadata (date, opponent, result).

   The per-game table is built by joining each overview gameLog event to its
   gamelog metadata by `eventId`. When a sport doesn't expose per-game stats,
   it falls back to a results-only table.

6. **Images** — headshots and logos are passed through ESPN's CDN combiner
   (`a.espncdn.com/combiner/i?img=<path>&w=<w>&h=<h>`) so they render at a sane
   size in markdown instead of their full source resolution.

7. **Quicklinks** — `createDeeplink` (from `@raycast/utils`) builds a deeplink
   to the `search-teams` command with a small `launchContext` describing the
   target. On launch the command inspects `props.launchContext` and renders the
   `TeamDetailView` or `PlayerDetailView` directly.

## Adding or extending sports

For most cases **there's nothing to add** — if ESPN's search returns a result
with a `sport` and `defaultLeagueSlug`, the team/roster/player views already
work for it.

You'd only need to touch code to:

- **Curate a browse list** (e.g. "show all NBA teams" without searching). Use
  the teams endpoint
  `site.api.espn.com/apis/site/v2/sports/<sport>/<league>/teams` and render the
  results the same way search results are rendered.
- **Support a sport with a different data shape.** If a league nests stats or
  roster data differently, extend the helpers in `search-teams.tsx`:
  - `extractRosterGroups()` — roster flattening / sectioning.
  - `buildPlayerMarkdown()` — season-stats and per-game tables.
  - `eventStatusName()` / `isUpcoming()` / `isCompleted()` — schedule status.

The quickest way to check whether a new league "just works" is to hit the
endpoints directly, e.g.:

```bash
curl -s "https://site.web.api.espn.com/apis/search/v2?query=<name>&limit=10"
curl -s "https://site.api.espn.com/apis/site/v2/sports/<sport>/<league>/teams/<id>/schedule"
curl -s "https://site.web.api.espn.com/apis/common/v3/sports/<sport>/<league>/athletes/<id>/overview"
```

If those return data, the extension will render it.

## Development

```bash
npm install
npx ray develop   # run in Raycast with hot reload
npx ray build     # type-check + bundle
npx ray lint      # ESLint + Prettier
```
