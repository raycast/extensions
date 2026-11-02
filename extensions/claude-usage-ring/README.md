# Claude Usage Ring

A Raycast menu bar extension that shows your **Claude subscription usage** as a small ring in the macOS menu bar:

- **5-hour session limit** (default)
- **Weekly (7-day) limit**, or both as concentric rings

Click the ring to see exact percentages, reset countdowns, your plan, and when the data was last updated.

The numbers come from the same source as `/usage` in Claude Code. They are not estimated from local logs.

## Install

Install **Claude Usage Ring** from the Raycast Store, then:

1. Search **Claude Usage** in Raycast and run it once. This activates the menu bar item and the 2-minute background refresh.
2. If macOS asks whether Raycast may access the `Claude Code-credentials` Keychain item, click **Always Allow**.

You need to be logged in to Claude Code (`claude` → `/login`) with a Pro, Max or Team subscription.

## Preferences

| Preference | Default | |
|---|---|---|
| Ring Shows | Session (5h) | `Session`, `Weekly`, or `Both` (outer = weekly, inner = 5h) |
| Show percentage | off | Shows `8%` next to the ring (`8% · 6%` in Both mode) |
| Amber threshold | 60 | Ring turns amber at this utilisation |
| Red threshold | 85 | Ring turns red above this utilisation |
| Credentials Source | Keychain | `~/.claude/.credentials.json` for setups that store the login in a file |

## How it works

1. Every ~2 minutes (and when you click the ring), the command reads Claude Code's OAuth login from the Keychain using `/usr/bin/security find-generic-password -s "Claude Code-credentials" -w`.
2. It calls `GET https://api.anthropic.com/api/oauth/usage` with that token. This is the endpoint `/usage` uses.
3. The last successful result is kept in Raycast's Cache, so the ring paints instantly after a restart.

The ring is an SVG rendered on the fly as a data URI with light and dark variants.

**Credentials are read-only.** The extension never refreshes the token and never writes to the Keychain. Refreshing would rotate the refresh token and sign Claude Code out. When the token expires, the extension waits until Claude Code refreshes it (which happens whenever you use Claude Code). The token is never cached, logged or displayed.

## States

| Situation | Ring | Dropdown |
|---|---|---|
| OK | normal | – |
| Data older than 15 min | dimmed | "Data from 23 min ago" |
| Not logged in / Keychain denied | hollow ring with `!` | how to fix it |
| Token expired, 401/403 | last value, dimmed | "Login expired. Open Claude Code once to refresh it." |
| 429 | last value, dimmed | "Rate limited, retrying at 14:32" (honours `retry-after`, else 10 min) |
| 5xx / offline | last value, dimmed | "Can't reach Anthropic" (backoff 2, 4, 8… up to 30 min) |
| Response format changed | last value, dimmed | "Usage format changed" (backoff 30 min) |
| Limit locked | full red ring | "Session limit reached: …" |
| Reset time passed | that window shows 0% until the next fetch | – |

Background runs never show toasts. **Refresh Now** (⌘R) ignores backoff and shows a HUD only if it fails. Clicking the ring refetches if the last attempt was more than 20 seconds ago.

## Caveats

- **The usage endpoint is undocumented.** It may change or disappear at any time. If that happens, the ring keeps the last value and shows "Usage format changed". The data source sits behind a `UsageSource` interface, so a Claude Code status-line-based source can be added later.
- **Not affiliated with Anthropic.** The extension only reads usage numbers with your own local Claude Code login. It makes no model requests, never refreshes or stores the token, and sends it nowhere except `api.anthropic.com`.
- macOS hides menu bar items when the menu bar is crowded. If the ring vanishes, free up space or use a menu bar manager.

## Troubleshooting

- **Ring shows `!`, "Not logged in"**: run `claude`, then `/login`.
- **"Keychain access denied"**: run the command again from Raycast and click **Always Allow**. You can also open Keychain Access, find `Claude Code-credentials`, and add Raycast under *Access Control*.
- **Ring never updates**: open Raycast Settings → Extensions → Claude Usage Ring and check that background refresh is enabled for the command.

## Development

```bash
npm run dev         # develop in Raycast with hot reload
npm test            # vitest unit tests (pure modules, no Raycast needed)
npm run lint        # ray lint (ESLint + Prettier + manifest validation)
npm run build       # ray build
npm run typecheck
node scripts/gen-icon.mjs   # regenerate assets/extension-icon.png
```

```
src/
├── usage-menu-bar.tsx   # the menu-bar command (UI only)
├── types.ts
└── lib/
    ├── credentials.ts   # Keychain / file, read-only
    ├── usage-api.ts     # fetch + defensive parsing + UsageSource
    ├── refresh.ts       # pure refresh state machine: backoff, throttle, errors
    ├── usage-store.ts   # Raycast Cache wrapper (snapshot only, never the token)
    ├── view.ts          # pure deriveView(): icons, labels, banners
    ├── ring.ts          # SVG ring renderer
    └── format.ts        # percent / reset time / plan formatting
```

### Icon approach (Phase 0 spike)

The menu bar icon is passed as `{ source: { light, dark } }`, where each value is a base64 SVG data URI. The 36×36 viewBox is drawn at 2× for Retina. If a future Raycast version stops rendering SVG data URIs, fall back to writing the SVG to `environment.supportPath` and passing the file path, or to pre-rendered bundled PNGs (see the plan).

## License

MIT
