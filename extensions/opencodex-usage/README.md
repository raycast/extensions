# OpenCodex Usage

Raycast extension that shows the rate-limit usage of every model provider connected to a running
[opencodex](https://github.com/lidge-jun/opencodex) proxy — the same 5h / weekly / monthly bars the
opencodex dashboard renders.

## Commands

- **Provider Usage** — list of all providers with quota bars, reset times, adapter/base URL details and
  request/token/cost stats for the selected range.

  One window also reports **pace** in plain language (`under pace`, `on pace`, `over pace`), kept
  muted so it never competes with the usage percentage. The detail pane keeps all windows in one
  compact block and adds a single sentence such as "Used 22% of the weekly window with 49% of the
  week gone. You have room to spare at this rate."

- **Usage Stats** — detailed breakdown mirroring the `#usage` dashboard page: summary totals (requests,
  coverage, input/output/cached/reasoning tokens, list-price estimate), a per-day request sparkline,
  and per-provider, per-model and per-day sections. Range is switchable in the search bar, surface
  (`all`/`codex`/`claude`/`grok`) via the actions menu.
- **Usage in Menu Bar** — worst quota percentage in the menu bar, refreshed every 10 minutes, with a
  per-provider breakdown in the dropdown.

## Preferences

- `OpenCodex URL` — base URL of the proxy (default `http://127.0.0.1:10100`).
- `Admin Token` — token for the proxy's management API. Recent opencodex builds answer `/api/*`
  with `401 opencodex admin token required` unless the request carries it. Leave the field empty
  and the extension reads `~/.opencodex/admin-api-token` (or `$OPENCODEX_HOME/admin-api-token`)
  itself; set it explicitly for a remote proxy or when the server runs with
  `OPENCODEX_ADMIN_AUTH_TOKEN`.
- `Usage Range` — default range for request/token statistics (`7d`, `30d`, `all`).
- `Ring Window` — which rate-limit window the ring next to a provider reports (`Weekly`, `5h`,
  `Monthly`, `Highest usage`). Providers that do not report the chosen window fall back to their
  highest-usage window.
- `Pace Window` — which window the pace hint tracks (`Weekly`, `5h`, `Monthly`, `Off`). Independent
  of `Ring Window`, so the ring can show the 5h burn while pace budgets the week.

### Usage in Menu Bar

- `Provider in Pill` — which provider the pill reports. `All providers` shows whichever is under
  most pressure.
- `Pill Window` — window reported by the pill, or inherit the `Ring Window` setting.
- `Pill Label` — percentage only, provider and percentage, or ring only.

## Requirements

A running [opencodex](https://github.com/lidge-jun/opencodex) proxy reachable at the configured
`OpenCodex URL`. The extension is read-only: it never sends prompts or credentials, and only issues
`GET` requests to that host.

## Endpoints used

| Endpoint                           | Purpose                                                           |
| ---------------------------------- | ----------------------------------------------------------------- |
| `GET /api/provider-quotas`         | quota windows per provider (`?refresh=1` forces upstream refresh) |
| `GET /api/providers`               | adapter, base URL, default model, disabled state                  |
| `GET /api/config`                  | default provider                                                  |
| `GET /api/usage?range=…&surface=…` | summary totals, daily series, per-model and per-provider stats    |

Asset regeneration (icons, logos, menu-bar rings) is documented in [CONTRIBUTING.md](CONTRIBUTING.md).
