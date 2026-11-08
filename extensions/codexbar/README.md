# CodexBar for Raycast

See your AI coding plan limits at a glance, powered by the [CodexBar](https://github.com/steipete/CodexBar) menu bar app.

CodexBar already signs in to Claude, Codex, Gemini, Cursor and many other providers. This extension reuses its data, so there is nothing to configure: no API keys and no extra logins.

## Commands

| Command | What it shows |
| --- | --- |
| **Usage Overview** | A dashboard of gauges, one row per provider, with reset countdowns and pace. |
| **Usage Limits** | Every plan limit tracked by CodexBar (5-hour session, weekly, monthly, model-specific windows) with the remaining quota, a reset countdown and your pace: whether you are in reserve or burning faster than an even spread, and when you would run out. Press `⌘R` to fetch fresh numbers from the providers. |
| **Cost History** | Daily token usage and API-equivalent cost from local Claude Code and Codex logs, with a per-model breakdown. |
| **Refresh Usage** | Fetches fresh limits from every enabled provider and shows a one-line summary in the HUD. |

### Choose and order providers

Press `⌘⇧L` (**Manage Providers**) in Usage Overview or Usage Limits to hide providers and reorder them (`⌘⌥↑` / `⌘⌥↓`). The layout is shared by both commands.

Want a command for a single provider? Use **Create Quicklink for Claude** (or any provider). The quicklink opens the dashboard filtered to that provider, and you can give it its own alias and hotkey.

Limits come first on purpose: on a subscription plan the question is "how much do I have left before the reset", not "how many dollars did I spend".

## Requirements

- [CodexBar](https://github.com/steipete/CodexBar) installed in `/Applications` (or `~/Applications`), with at least one provider enabled.

## Preferences

- **Percentages**: show limits as *remaining* (default, like CodexBar) or *used*.

## How it works

- **Usage Limits** reads `widget-snapshot.json` from CodexBar's App Group container (`~/Library/Group Containers/<team>.com.steipete.codexbar/`). The menu bar app rewrites it on every refresh to feed its widgets, so the command opens instantly.
- **Refresh** runs the CLI bundled with the app (`CodexBar.app/Contents/Helpers/CodexBarCLI usage --format json`). It contacts every enabled provider and can take around 30 seconds. The result is cached, and for each provider the newest reading (app snapshot or CLI) wins.
- **Pace** is computed locally with the same linear model CodexBar uses: after 12 hours of a 7-day window, about 7% used is "on pace".
- **Cost History** runs `codexbar cost --format json`, which reads local logs through CodexBar's scan cache. Costs are estimates at API list prices.
- Only providers enabled in CodexBar are queried. Account emails are never displayed.
