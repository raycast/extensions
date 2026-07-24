# sir.golf — Golf Leaderboards for Raycast

> **[sir.golf](https://sir.golf/)** — _A Nod to the Classics, A Bow to the Course._

[![Add to Raycast](https://www.raycast.com/julianpaul/sir-golf/install_button@2x.png)](https://www.raycast.com/julianpaul/sir-golf)

<!-- The badge above resolves once the extension is live in the Raycast Store. -->

Live **PGA Tour**, **LPGA** and **DP World Tour** leaderboards, the week's golf
schedule with **every major badged**, and one-tap **Add to Calendar** — right
inside Raycast. No account, no API key, no backend: it fetches directly from
ESPN's free public JSON API.

## Commands

| Command         | What it shows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Leaderboard** | One unified rankings view. The dropdown switches between **This Tournament** (live board — or the most recent completed event when nothing's live; auto-refreshes every 30s) and **season rankings**: scoring average (default), FedEx Cup, money, wins, driving, GIR, birdies, top-10s, cuts. A live/recent **major** is flagged ⛳ in the title. Every player has a **side-pane** detail: headshot, country, age, turned-pro, height/weight, college, and season stats.                                                                |
| **Golf Season** | The tour schedule — this week, upcoming, recent, and **any past season with winners**. One dropdown filters by **tour** or by **where it streams** (🇺🇸 US · 🇬🇧 UK & Ireland · 🇩🇪 Germany · 🇦🇹 Austria · 🇫🇷 France). **Majors are badged** with a star + "Major Championship" tag. **Add to Calendar** (⌘⇧A) writes a branded `.ics` — event details and where-to-watch — straight to your calendar. Side pane shows course, location, purse, defending champion, forecast, winner, the broadcast/where-to-watch guide, and an ESPN link. |

Switch tour (PGA / LPGA / DP World) with **⌘T**; the default-tour preference sets
the starting tour. Details show in a **side pane**, toggle with **⌘** → _Show/Hide
Details_. Change the season year in Golf Season with **⌘[** / **⌘]**.

## Run it locally

Requires the [Raycast](https://raycast.com) app and Node 20+.

```bash
npm install
npm run dev      # ray develop — opens the commands in Raycast
```

Then trigger **Leaderboard** or **Golf Season** from Raycast. `npm run build` and
`npm run lint` validate the extension without launching it.

## How it works

Two keyless ESPN hosts, no backend:

- **`site.api.espn.com`** — one cheap (~37 KB) `/{tour}/scoreboard` call drives
  Leaderboard and Golf Season: the board is `events[0].competitions[0].competitors[]`,
  and the schedule rides along in `leagues[0].calendar` (no second request, and we
  deliberately avoid the 17 MB `?dates=YYYY` payload). When nothing's live, the
  Leaderboard refetches the last completed event by date for a useful fallback.
- **`sports.core.api.espn.com`** (HATEOAS) — tournament detail (venue, course,
  purse, defending champion, weather) and the season leaders (FedEx Cup, scoring
  average, …). Leader entries are `$ref` links to athletes, resolved in parallel.

Responses are cached (`useCachedPromise` / `useFetch`) so the API isn't hammered.
All parsing lives in [`src/espn.ts`](./src/espn.ts) and treats every field as
optional — the API is unofficial, so the UI fails soft. Majors carry no flag in
ESPN's feed, so they're detected by name (`majorLabelOf`), scoped per tour to
avoid false positives. **Add to Calendar** builds the `.ics` locally
(`buildEventIcs`) and hands it to the OS calendar — no service, no upload.

## Known caveats

- **Unofficial API, no SLA.** ESPN can change or remove it without notice.
- **No tournament logos** — golf events carry none in ESPN's feed, so the tour/
  league logo is used on Golf Season events. Player country flags and headshots
  do exist.
- **No tee times / qualifying times** — the golf `summary` endpoint returns 502,
  and the lightweight scoreboard has no tee-time fields. The detail view links to
  ESPN for those.
- **Broadcast data is US-only** from ESPN. Non-US "where to watch" (Sky, ServusTV,
  ORF, Canal+, …) comes from a hand-maintained `WATCH_GUIDE` table in
  `src/espn.ts`, shown clearly as a general guide — rights vary by region & season.
- **Scope is PGA + LPGA + DP World.** Champions Tour data is thin; LIV is
  effectively absent on ESPN — neither is offered. Some season-leader categories
  may be PGA-only; the Season command shows an empty-state for tours that don't
  publish a given stat.

## Project layout

```
src/espn.ts            shared ESPN data layer: fetchers, parsers, majors, .ics, watch guide
src/leaderboard.tsx    Leaderboard command (tournament + season rankings)
src/golf-season.tsx    Golf Season command (schedule, majors, add-to-calendar, region filter)
src/player-detail.tsx  shared player side-pane (headshot, bio, stats)
```

## License

MIT
