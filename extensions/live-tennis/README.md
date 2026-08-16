# Live Tennis

Live tennis scores, upcoming fixtures and player rankings — ATP, WTA, Challenger, ITF and Juniors — right from Raycast, powered by the [Live Tennis API](https://livetennisapi.com).

## Commands

- **Live Matches** — every match currently in play, with the set/game score, the current game's points, who is serving, and a red **BP** tag whenever the returner has a break point. A detail pane (⌘ + Enter on "Show Details") shows rankings, surface, round and format. Filter by tour from the dropdown.
- **Upcoming Matches** — scheduled fixtures, earliest first, with tournament, round, surface and scheduled start time.
- **Search Players** — look up any player and see their current ranking, ranking movement, points, country and age. With no search text, ranked players are listed first.

## Setup

The extension needs a Live Tennis API key:

1. Sign up at [livetennisapi.com](https://livetennisapi.com) — the **free tier needs no card** and covers everything this extension uses (live scores, fixtures, players).
2. Paste the key into the extension's **API Key** preference when Raycast asks for it.

## A note on the free tier and auto-refresh

The free tier allows **30 requests/minute and 100 requests/day**. That suits checking in on a match or looking up players on demand — it is not enough for all-day background refreshing. Accordingly:

- Live Matches auto-refreshes only **while the command is open**, every 60 seconds by default. You can slow it down or switch to manual-only (⌘R) in the command's preferences.
- Tour filtering of live matches happens client-side, so changing the dropdown costs no extra requests.
- If you hit the limit, the extension says so plainly (the API returns a `Retry-After`), rather than failing silently.

Head-to-head records, point-by-point history and market prices exist in the API but are paid-tier features and are not used by this extension.

## Disclosure

This extension is built and maintained by the maintainer of the Live Tennis API.
