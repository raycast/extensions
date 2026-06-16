# Menu Bar World Cup

Live FIFA World Cup scores, two ways:

- **World Cup Menu Bar** — the in-progress score sits in your menu bar (`CPV 0–1 ESP`); click for a dropdown of every fixture grouped into Live / Upcoming / Finished.
- **Live Score In Root Search** — a no-view background command that rewrites its own subtitle, so the live score shows under the command name in Raycast root search.

Both refresh every minute and share one fetch + parser (`src/lib/worldcup.ts`).

## Data source

ESPN's public scoreboard endpoint — no API key required:

```
https://site.api.espn.com/apis/site/v2/sports/soccer/<league>/scoreboard
```

The competition is configurable in preferences (`fifa.world` by default; also Women's World Cup, UCL, MLS, Premier League).

## Develop

```sh
npm install
npm run dev
```
