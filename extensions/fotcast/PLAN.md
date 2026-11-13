# Fotcast — FotMob for Raycast — Build Plan

Daily football schedule in Raycast. Favorite any number of teams and leagues,
then view every league's matches for a day or only your favorites. Nothing
else in V1: no players, tables, lineups, or notifications.

Reference extensions (same author, copy their conventions verbatim):

- `../meet-with` — package.json shape, eslint/tsconfig, `List` + `ActionPanel`
  idioms, `useCachedPromise`, LocalStorage favorites, day-labelling helpers.
- `../meteoblue-raycast` — multi-command layout, `List.Section` grouping.
- The Raycast store's `fotmob` extension (raycast/extensions, commit
  `8a4409d0`) has the API paths but poor UX and is buggy. Take API knowledge
  only. Do not copy its views, its 50-match cap, or its `__NEXT_DATA__` page
  scraping (not needed for V1).

Ponytail rules apply: fewest files, no abstractions with one caller, stdlib
and `@raycast/utils` before anything custom. No preferences in
`package.json`. No new dependencies beyond `@raycast/api` + `@raycast/utils`.

---

## 1. FotMob API (verified 2026-09-10, unofficial, no auth)

Send a browser `User-Agent` on every request (FotMob 404s some paths without
one). Sample responses are checked in under `docs/api-samples/` — build
against those, then confirm live.

### 1.1 Matches for a day

```
GET https://www.fotmob.com/api/data/matches?date=YYYYMMDD&timezone=<IANA tz>
```

`timezone` = `Intl.DateTimeFormat().resolvedOptions().timeZone`. It decides
which calendar day a match lands on. Response:

```ts
{ date: string, leagues: MatchDayLeague[] }

MatchDayLeague {
  id: number;            // per-day instance id, e.g. 943230. NOT stable.
  primaryId: number;     // canonical league id, e.g. 42. Matches allLeagues + search ids.
  parentLeagueId?: number;
  parentLeagueName?: string | null;
  isGroup?: boolean | null;
  groupName?: string;
  name: string;          // "Champions League"
  ccode: string;         // "INT", "ENG", ...
  internalRank: number;  // FotMob's popularity order, lower = more popular
  localRank: number;
  simpleLeague: boolean;
  matches: Match[];
}

Match {
  id: number;
  leagueId: number;      // == MatchDayLeague.id (instance id), not primaryId
  time: string;          // "10.09.2026 18:45" — NOT local time, ignore it
  timeTS: number;        // epoch ms of kickoff
  statusId: number;      // seen: 1 scheduled, 2 1st half, 3 2nd half, 6 finished, 106 cancelled
  tournamentStage: string;
  eliminatedTeamId: number | null;
  home: { id: number; name: string; longName: string; shortName?: string; score: number };
  away: { id: number; name: string; longName: string; shortName?: string; score: number };
  status: {
    utcTime: string;     // ISO, use this for kickoff time
    started: boolean; finished: boolean; cancelled: boolean;
    ongoing?: boolean; awarded?: boolean;
    scoreStr?: string;   // "0 - 1"
    aggregatedStr?: string;
    liveTime?: { short: string; long: string; maxTime: number; addedTime: number }; // short: "43’"
    reason?: { short: string; long: string; shortKey: string; longKey: string };   // "FT" / "Can" / "PP"
    halfs?: Record<string, string>;
  };
}
```

Derive status from flags, not `statusId`:

| state       | rule                                   | show                         |
|-------------|----------------------------------------|------------------------------|
| cancelled   | `status.cancelled`                     | `reason.short` (grey tag)    |
| live        | `status.started && !status.finished`   | `liveTime.short` (red tag)   |
| finished    | `status.finished`                      | `reason.short ?? "FT"` text  |
| scheduled   | otherwise                              | local kickoff time text      |

### 1.2 All leagues

```
GET https://www.fotmob.com/api/data/allLeagues
```

```ts
{
  popular: LeagueRef[];
  international: { ccode: "INT"; name: "International"; leagues: LeagueRef[] }[];
  countries:     { ccode: string;  name: string;          leagues: LeagueRef[] }[];
}
LeagueRef { id: number; name: string; localizedName: string; pageUrl: string; ccode: string }
```

`LeagueRef.id` == `MatchDayLeague.primaryId`. Used for browsing/favoriting
leagues without typing.

### 1.3 Search (teams and leagues)

```
GET https://apigw.fotmob.com/searchapi/suggest?term=<query>&lang=en
```

```ts
{
  teamSuggest?:   { options: { text: "Arsenal|9825",        payload: { id: "9825", leagueId: 47, leagueName: "Premier League" } }[] }[];
  leagueSuggest?: { options: { text: "Premier League|47",   payload: { id: "47", countryCode: "ENG" } }[] }[];
  matchSuggest?, squadMemberSuggest?  // ignore
}
```

`text` is `"Name|id"` — split on `|`. Ids are strings here, numbers
elsewhere; normalise to `number` at the boundary.

### 1.4 Images and links

```
team crest    https://images.fotmob.com/image_resources/logo/teamlogo/{teamId}.png
league logo   https://images.fotmob.com/image_resources/logo/leaguelogo/{id}.png        (light)
              https://images.fotmob.com/image_resources/logo/leaguelogo/dark/{id}.png   (dark)
match page    https://www.fotmob.com/match/{matchId}
team page     https://www.fotmob.com/teams/{teamId}
league page   https://www.fotmob.com/leagues/{leagueId}
```

League logo as a Raycast image: `{ source: { light: <light url>, dark: <dark url> } }`.

---

## 2. Product spec

### 2.1 Commands (package.json)

| name        | title       | mode | description                                 |
|-------------|-------------|------|---------------------------------------------|
| `matches`   | Matches     | view | Today's football matches across all leagues |
| `favorites` | Favorites   | view | Manage favorite teams and leagues           |

Extension: `name: "fotcast"`, `title: "Fotcast"`, category `"News"`,
platforms `["macOS", "Windows"]`, no `preferences` key at all.

### 2.2 Matches command

```
┌──────────────────────────────────────────────────────────────────┐
│ ←  Search teams or leagues…              [ All Leagues ▾ ]        │
├──────────────────────────────────────────────────────────────────┤
│ 📅 Today                                                          │
│                                                                   │
│ ★ Teams                                                           │
│ ⬡ Napoli vs Arsenal                        ⬡  [● 0 – 1]  43'      │
│                                                                   │
│ ★ Champions League                                                │
│ ⬡ Fenerbahçe vs Roma                       ⬡  [● 0 – 1]  43'      │
│ ⬡ Bayern München vs Bodø/Glimt             ⬡            9:00 PM   │
│ ⬡ Sundby BK vs Midtjylland                 ⬡  [0 – 6]    FT       │
│                                                                   │
│ Premier League                                                    │
│ …                                                                 │
└──────────────────────────────────────────────────────────────────┘
```

**List**
- `navigationTitle` = day label: `Today`, `Tomorrow`, `Yesterday`, else
  `Thursday, Sep 10` (reuse `labelFor` logic from `meet-with/src/schedule.tsx`).
- Native filtering on. Each item gets `keywords={[league.name, league.ccode]}`
  so typing "champions" or "ENG" narrows the list.
- `searchBarAccessory` = `List.Dropdown` with `storeValue` and two items:
  `All Leagues` (`all`) and `Favorites` (`favorites`). Nothing else.
- `isLoading` while fetching; `List.EmptyView` for "No matches" and, in
  Favorites mode with an empty favorites list, "No favorites yet" with an
  action that `launchCommand({ name: "favorites", type: LaunchType.UserInitiated })`.
- The footer title carries the day (`Today · Thu, Sep 10`). Raycast rows are
  always selectable, so there is no date row; the picker lives in actions.

**Sections, in order**
1. `★ Teams` — every match where home or away team id is a favorite team,
   sorted by kickoff (`timeTS`). Only rendered when non-empty.
2. One `★ <league>` section per favorite league (matched on `primaryId` or
   `parentLeagueId`), pinned above the rest.
3. The remaining leagues, sorted by `localRank` when FotMob supplies one, then
   `internalRank`, then `name`. Title = `league.name` (if `parentLeagueName` is
   set and differs, title = `${parentLeagueName} · ${name}`). Matches inside
   sorted by `timeTS`. A favorite-team match appears here too and carries an
   `Icon.Star` accessory.

In `favorites` dropdown mode, sections 3 is dropped; 1 and 2 render as above.

**Row** (`List.Item`)
- `icon`: home crest URL. `title`: `${home.name} vs ${away.name}`, always.
- `accessories`, in order:
  1. `{ icon: <away crest> }`
  2. score badge, present once the match has started:
     live `{ tag: { value: "● 0 – 1", color: Color.Red } }`;
     finished `{ tag: { value: "0 – 1", color: <result colour> } }` where the
     colour is green/red for a favorite club's win/loss and
     `Color.SecondaryText` for a draw or when no single favorite club is in it;
     cancelled `{ tag: { value: reason?.short ?? "PP", color: Color.SecondaryText } }`.
  3. state text: live `liveTime.short`, finished `reason?.short ?? "FT"`,
     scheduled local kickoff time via
     `toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})`.
  4. `{ icon: Icon.Star }` outside the `★ Teams` section when the match has a
     favorite team.
  If `status.aggregatedStr` exists, put it in the badge's `tooltip` as `Agg. 0 – 5`.
- No subtitle. No extra captions.

**Match view** (Enter, `src/detail.tsx`, pushed `Detail`)
Markdown is one SVG scoreboard drawn like meet-with's calendar: crests embedded
as data URIs, centred score (or `vs`), state line (red when live), team names,
goals/red cards in two borderless columns, a pitch chart of both starting
elevens from FotMob's `horizontalLayout` coordinates (team sheet by position as
the fallback), and substitutions paired by minute. Colours follow
`environment.appearance`. Metadata sidebar: kickoff, competition with league
logo, stadium, referee, attendance, then top stats (possession, xG, shots, on
target, big chances, corners). Score and status come from the details header
once loaded, so the view refreshes on its own 60 s timer while live.

**Actions** (`ActionPanel`), top to bottom:
1. `Action.Push` "Show Details" → match view. (Enter)
   `Action.OpenInBrowser` "Open in FotMob" → match page.
2. Section "Favorites": `Favorite <home.name>` / `Unfavorite <home.name>`,
   same for away, then `Favorite <league.name>` / `Unfavorite …`. Icons
   `Icon.Star` / `Icon.StarDisabled`. Toast on change (`showToast` success).
3. Section "Day": `Next Day` ⌘], `Previous Day` ⌘[, `Today` ⌘T,
   `Action.PickDate` "Pick Date" ⇧⌘D.
4. `Refresh` with `Keyboard.Shortcut.Common.Refresh` → `revalidate()`.
5. `Action.OpenInBrowser` "Open League in FotMob", "Open <team> in FotMob" ×2.

Shortcuts are declared per platform (`cmd` on macOS, `ctrl` on Windows); the
Raycast linter rejects bare `cmd` on a Windows-capable extension.

**Data**
- `useCachedPromise(fetchMatches, [dateKey])` with `keepPreviousData: true`
  so day navigation does not flash empty.
- Auto-refresh: a `useEffect` interval of 60 s that revalidates while any
  match in the response is live. Clear it otherwise. The match view fetches
  details plus both crests in one `useCachedPromise` and refreshes itself.
### 2.3 Favorites command

```
┌──────────────────────────────────────────────────────────────────┐
│ ←  Search teams or leagues…                                       │
├──────────────────────────────────────────────────────────────────┤
│ Teams                                                             │
│ ⬡ Arsenal                          Premier League          ★      │
│ ⬡ Bodø/Glimt                       Eliteserien             ★      │
│ Leagues                                                           │
│ ⬡ Champions League                 INT                     ★      │
│ ⬡ Premier League                   ENG                     ★      │
└──────────────────────────────────────────────────────────────────┘
```

- Empty search: sections `Teams` and `Leagues` listing current favorites.
  Actions: `Remove from Favorites` (Enter), `Open in FotMob`.
- Search text ≥ 2 chars: `filtering={false}`, `throttle`, hit §1.3.
  Sections `Teams` (from `teamSuggest`) and `Leagues` (from `leagueSuggest`).
  Rows: crest/logo icon, name title, `subtitle` = `leagueName` for teams,
  `countryCode` for leagues. Accessory `Icon.Star` when already a favorite.
  Actions: `Add to Favorites` / `Remove from Favorites` (Enter), `Open in FotMob`.
- Order of favorites: insertion order. No reordering in V1.

### 2.4 Favorites storage

One `LocalStorage` key `favorites`, JSON:

```ts
type Favorites = {
  teams:   { id: number; name: string; leagueName?: string }[];
  leagues: { id: number; name: string; ccode?: string }[];
};
```

Implement with `useLocalStorage<Favorites>("favorites", { teams: [], leagues: [] })`
from `@raycast/utils` (no hand-rolled hook). Expose:

```ts
function useFavorites(): {
  favorites: Favorites; isLoading: boolean;
  isTeam(id: number): boolean; isLeague(id: number): boolean;
  toggleTeam(t: Favorites["teams"][number]): Promise<void>;
  toggleLeague(l: Favorites["leagues"][number]): Promise<void>;
}
```

Both commands read the same key, so a star set in Matches shows in Favorites
on next open without extra plumbing.

---

## 3. File layout

```
fotcast/
├── package.json            two commands, no preferences (§2.1)
├── tsconfig.json           copy from ../meet-with
├── eslint.config.js        copy from ../meet-with
├── .gitignore              copy from ../meet-with
├── assets/extension-icon.png   512×512, a football glyph on a dark green ground
├── docs/api-samples/       fixtures (already present)
├── src/
│   ├── fotmob.ts           types from §1, fetchMatches(dateKey), fetchAllLeagues(),
│   │                       fetchMatchDetails(id), search(term), url helpers
│   ├── store.ts            Favorites type + useFavorites() (§2.4) — NOT favorites.ts:
│   │                       Raycast resolves command "favorites" to src/favorites.*
│   ├── schedule.ts         PURE, no Raycast imports: dateKey(date), dayLabel(date),
│   │                       statusOf(match), favorite predicates, buildSections()
│   ├── matches.tsx         Matches command (§2.2)
│   ├── detail.tsx          MatchDetailView: SVG scoreboard + metadata sidebar
│   └── favorites.tsx       Favorites command (§2.3)
├── test/schedule.test.ts   node --test against docs/api-samples/matches-20260910.json
├── CHANGELOG.md
└── README.md
```

Six source files. Do not add `hooks/`, `views/`, `utils/`, `types/`
directories. If a helper has one caller, inline it.

---

## 4. Work packages for parallel agents

Each package must finish with `npm run lint` and `npm run build` clean.
Packages B, C, D can run in parallel once A has landed, or all four in
parallel if each agent codes against the signatures in §2.4 and §5 exactly.

### WP-A · Scaffold + API + storage  (blocking, small)
1. `npm init` the extension: `package.json` per §2.1, copy `tsconfig.json`,
   `eslint.config.js`, `.gitignore` from `../meet-with`, bump
   `@raycast/api` / `@raycast/utils` to the versions `../meet-with` uses.
   `npm install`.
2. `src/fotmob.ts`: the types in §1, three fetchers, URL helpers. Every fetch
   sets `User-Agent` and throws `Error(\`FotMob ${status}\`)` on non-2xx.
   `search()` returns `{ teams: {id,name,leagueName}[], leagues: {id,name,ccode}[] }`
   with ids already numbers.
3. `src/store.ts` per §2.4.
4. Placeholder `src/matches.tsx` and `src/favorites.tsx` that render
   an empty `<List />` so the build passes.
5. Icon at `assets/extension-icon.png`.

Done when `ray develop` registers both commands and they open.

### WP-B · Schedule logic + test
1. `src/schedule.ts` per §3 signatures (§5 below). Pure functions only.
2. `test/schedule.test.ts` with `node --test` (add `"test": "node --test test/"`
   to scripts; run with `npx tsx` or compile — pick whichever needs zero
   config; `tsx` as a devDependency is acceptable). Assert against the
   fixture: 41 leagues, 80 matches; Champions League sorts first; a favorite
   team id `9823` (Bayern) yields exactly one favorites match; league fav
   `42` yields the 6 CL matches (matched through `primaryId`, not `id`);
   `statusOf` returns `live` for match `6106331`, `finished` for `6019466`,
   `cancelled` for `6106048`, `scheduled` for `6106240`.

### WP-C · Matches command
`src/matches.tsx` per §2.2, built on `schedule.ts` + `store.ts` +
`fotmob.ts`. Keep it one file, one component plus a `MatchRow` component.
Verify in `ray develop`: day nav, dropdown persistence across relaunch,
favorites pinned section, star toggling updates the list without reload,
live tag turns red, empty states.

### WP-D · Favorites command
`src/favorites.tsx` per §2.3. One file. Verify: search debounce,
add/remove reflects immediately, favorites survive relaunch, Matches picks
them up.

### WP-E · Polish (after C and D)
README (usage, no setup needed, unofficial API caveat), CHANGELOG,
`metadata/` screenshots ×3 (Matches all, Matches favorites, Favorites
search), `ray lint --fix`.

### Follow-up, not V1
- Detail pane (⌘D) with scoreboard: crests, score, minute, kickoff, aggregate.
  Same SVG-in-markdown pattern as `meet-with/src/schedule.tsx`.
- Menu-bar live score for favorite team.

---

```ts
import type { Match, MatchDayLeague } from "./fotmob";
import type { Favorites } from "./store";

export type MatchState = "live" | "finished" | "cancelled" | "scheduled";
export type Mode = "all" | "favorites";

export function dateKey(d: Date): string;               // "20260910" in local time
export function shiftDay(d: Date, delta: number): Date;  // local-midnight safe
export function dayLabel(d: Date): string;               // Today / Tomorrow / Yesterday / "Thursday, Sep 10"
export function statusOf(m: Match): MatchState;
export function hasFavoriteTeam(m: Match, favs: Favorites): boolean;
export function isFavoriteLeague(l: MatchDayLeague, favs: Favorites): boolean;
export function isFavoriteMatch(m: Match, league: MatchDayLeague, favs: Favorites): boolean;

export type SectionMatch = { match: Match; league: MatchDayLeague };
export type Section = { key: string; title: string; matches: SectionMatch[] };
// mode "all":       [★ Teams?, ...★ favorite leagues, ...remaining leagues]
// mode "favorites": [★ Teams?, ...★ favorite leagues]
export function buildSections(leagues: MatchDayLeague[], favs: Favorites, mode: Mode): Section[];
```

`Section.matches` holds `{ match, league }` pairs, so the `★ Teams` section's
rows carry their own league and `matches.tsx` needs no `leagueById` map.
League sections keep key `String(league.id)`; the teams section keys `"teams"`.

---

## 6. Acceptance checklist

- [ ] Both commands open in < 1 s with cached data, no preferences prompt.
- [ ] Matches: 41 leagues / 80 matches for the fixture day render without a cap.
- [ ] Favorite team match shows in `★ Teams` and in its league section with a star.
- [ ] Favorite league gets its own pinned `★ <league>` section, matched via `primaryId`.
- [ ] Dropdown choice survives relaunch (`storeValue`).
- [ ] ⌘] / ⌘[ / ⌘T / Pick Date work; previous day's list stays visible while loading.
- [ ] Live matches show a red `● 0 – 1` score badge and refresh every 60 s.
- [ ] Kickoff times are local (derived from `status.utcTime`, never `time`).
- [ ] Favorites command: search returns teams and leagues, toggling persists.
- [ ] `npm run lint` and `npm run build` clean; `npm test` passes.
- [ ] Zero preferences, zero dependencies beyond `@raycast/api`, `@raycast/utils` (+ `tsx` dev).
