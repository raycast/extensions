# Claude Usage Forecast

Raycast extension that shows how much of your **weekly Claude Code rate limit** you have burned, and predicts **when you will hit 100%** based on your own weekday rhythm.

## Why not just use ccusage

`ccusage` counts tokens in your local transcripts. Your weekly limit is a server-side, model-weighted budget — token totals correlate with it but drift, so a token-only forecast disagrees with what `/usage` reports.

This extension uses both, for the thing each is actually good for:

| Source | Used for |
| --- | --- |
| `api.anthropic.com/api/oauth/usage` | the **real** current utilization % and the exact reset time |
| `~/.claude/projects/**/*.jsonl` | the **shape** of usage — which hours and weekdays you actually work |

The two are stitched with one calibration constant:

```
k = utilizationNow / costInsideThisWindowSoFar     [% per $]
```

so the absolute accuracy of the local cost model is irrelevant — only the ratios between models and token kinds matter, and the displayed percentage always matches Claude Code.

## Forecast model

- **Day-of-week profile** — weighted mean cost per weekday over the lookback window, with a 21-day half-life so recent weeks dominate. Days with zero usage count (a quiet Sunday is signal). Each weekday's single largest day is dropped once there are 5+ observations, so one runaway session cannot skew the pattern.
- **Hour-of-day profile** — normalized share of a day's usage per local hour, so a forecast made at 09:00 knows most of the day is still ahead, and one made at 22:00 knows it is not.
- **Projection** — walks forward hour by hour to the reset, accumulating `k × dowWeight × hourWeight`, and reports the first hour that crosses 100%.

## Commands

- **Claude Usage Menu Bar** — `87%` in the menu bar, green/orange/red by threshold. Refreshes every 10 minutes; **this background poll is what builds the real observation history**, since the API only ever reports "right now".
- **Claude Weekly Usage** — SVG graph (actual, forecast, limit, weekend shading, predicted crossing), per-day table for the current window, and your learned weekly pattern.

## Install

```bash
cd claude-usage-forecast
npm install
npm run dev      # registers the extension with Raycast; leave running once
```

Then in Raycast, open **Extensions → Claude Usage Forecast** and enable the menu bar command.

Requires a signed-in Claude Code (`claude`) on macOS. The OAuth token is read from the Keychain item `Claude Code-credentials`, or `~/.claude/.credentials.json` as a fallback. Nothing is sent anywhere except the usage endpoint.

## Preferences

| Preference | Default | Notes |
| --- | --- | --- |
| History Lookback (days) | 70 | How far back to learn the weekday pattern |
| Warn / Danger Threshold | 75 / 90 | Menu bar colour |
| Chart Rendering | SVG data URI | Switch to *temp file* or *text blocks* if the image does not render |
| Menu Bar Title | Weekly % | Or `% → projected %`, or `%` + sparkline |

## Caveats

- The forecast assumes next week looks like recent weeks. A day off or an unusually heavy session moves it.
- Only calendar days present in the transcripts feed the pattern; with under 14 days of history the extension says so.
- Scoped Opus / Sonnet weekly quotas are shown when the API reports them, but the forecast tracks the overall weekly limit.
- The first scan reads every transcript touched in the lookback window (a few seconds on a large `~/.claude`). Results are cached per file by size and mtime, so later runs are near-instant.
