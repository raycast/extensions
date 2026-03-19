# NBA Game Check

Check if your NBA team plays today, see the last 3 scores, and the next 3 upcoming games — all from Raycast.

## Features

- **Today's game**: See if your team plays today, with live scores during games
- **Recent results**: Last 3 completed games with W/L indicators and scores
- **Upcoming schedule**: Next 3 scheduled games with dates and tip-off times in your local timezone
- **Flexible team search**: Search by team name (`Knicks`), city (`New York`), abbreviation (`NYK`), or nickname (`Dubs`, `Sixers`, `Cavs`)

## Setup

This extension uses the [BallDontLie API](https://www.balldontlie.io/) to fetch NBA game data. You'll need a free API key:

1. Go to [app.balldontlie.io](https://app.balldontlie.io) and create a free account
2. Copy your API key from the dashboard
3. When you first run the extension, Raycast will prompt you to paste your API key — it's stored securely in Raycast preferences

The free tier allows 5 requests per minute, which is more than enough for personal use. Each team lookup uses 2 requests, and results are cached so repeated lookups won't hit the API again.

## Usage

Open Raycast and type **"Check NBA Team"**, then enter a team:

| Input type | Examples |
|------------|----------|
| Team name | `Knicks`, `Lakers`, `Warriors` |
| City | `New York`, `Boston`, `Miami` |
| Abbreviation | `NYK`, `BOS`, `LAL` |
| Nickname | `Dubs`, `Sixers`, `Cavs`, `Wolves` |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Open the game on NBA.com |
| `⌘ C` | Copy the score (completed games) |
| `⌘ ⇧ C` | Copy the matchup |
| `⌘ R` | Refresh data |
