# Claude Usage Ring

A Raycast menu bar extension that shows your **Claude subscription usage** as a small ring in the macOS menu bar:

- **5-hour session limit** (default)
- **Weekly (7-day) limit**, or both as concentric rings

## Commands

| Command | |
|---|---|
| **Claude Usage Ring** | The menu bar ring. Click it for exact percentages, reset countdowns, your plan, and when the data was last updated. |
| **Check Claude Usage** | The same data in a Raycast window. Actions: Open Usage Page (↵), Refresh Usage (⌘R), Copy Usage Summary (⌘⇧C), Configure Extension. Refreshing here also updates the ring. |
| **Connect Claude Code** | Lets Claude Code feed the ring live through its status line, with no API calls. Recommended. |

## Install

Install **Claude Usage Ring** from the Raycast Store, then:

1. Run **Claude Usage Ring** once. This activates the menu bar item and its background refresh.
2. Run **Connect Claude Code** and press ↵ (recommended, see below).
3. If macOS asks whether Raycast may access the `Claude Code-credentials` Keychain item, click **Always Allow**.

You need Claude Code with a Pro or Max subscription.

## Where the numbers come from

There are two sources. Both report the same numbers you see with `/usage` in Claude Code, not estimates from local logs.

**1. Claude Code (preferred).** After every reply, Claude Code hands your 5-hour and weekly usage to its status line. **Connect Claude Code** installs a tiny script (`~/.claude/usage-ring-statusline.sh`) as the status line. The script saves only the `rate_limits` numbers to `~/.claude/usage-ring.json`, using macOS's built-in `plutil`, and passes everything on to your previous status line if you had one. Your existing status line keeps working, and disconnecting restores it exactly. This source costs nothing, needs no login access and can't be rate-limited.

**2. The usage API (fallback).** When Claude Code hasn't reported in the last 5 minutes, the extension reads Claude Code's login from the Keychain (`/usr/bin/security find-generic-password -s "Claude Code-credentials" -w`) and calls `GET https://api.anthropic.com/api/oauth/usage`, the same endpoint `/usage` uses. Access is read-only: it never refreshes the token (refreshing would sign Claude Code out), and never caches, logs or displays it. Set **Data Source** to *Claude Code Only* to turn this off completely.

The last result is kept in Raycast's Cache, so the ring paints instantly after a restart. The dropdown shows "via Claude Code" when the numbers came from source 1.

## Preferences

| Preference | Default | |
|---|---|---|
| Ring Shows | Session (5h) | `Session`, `Weekly`, or `Both` (outer = weekly, inner = 5h) |
| Show percentage | off | Shows `8%` next to the ring (`8% · 6%` in Both mode) |
| Amber threshold | 60 | Ring turns amber at this utilisation |
| Red threshold | 85 | Ring turns red above this utilisation |
| Data Source | Automatic | *Automatic* uses Claude Code first, then the API. *Claude Code Only* never touches your login. |
| Credentials Source | Keychain | `~/.claude/.credentials.json` for setups that store the login in a file |

## Being gentle with the API

Anthropic rate-limits the usage endpoint per account, and the limit is shared with Claude Code's own `/usage`. The extension therefore:

- polls every **5 minutes** in the background, and only when Claude Code hasn't reported recently
- when you open the ring or the window, refetches only if the last attempt was **over a minute ago**
- after a **429**, pauses all requests, including Refresh Now, for 5, then 10, 20 and 30 minutes, or longer if `retry-after` asks for it. Your last numbers stay visible, at full opacity, with a calm "Paused by Anthropic, retrying at 13:01" note.
- after network or server errors, backs off background polling (2, 4, 8… up to 30 min). Opening the ring or the window still retries right away.

## States

| Situation | Ring | Dropdown |
|---|---|---|
| OK | normal | "Updated 1 min ago" (+ "via Claude Code") |
| Data older than 15 min | dimmed | "Data from 23 min ago" |
| 429 | last value, normal | "Paused by Anthropic, retrying at 13:01" |
| Not logged in / Keychain denied | hollow ring with `!` | how to fix it |
| Token expired, 401/403 | last value, dimmed | "Login expired. Open Claude Code once to refresh it." |
| 5xx / offline | last value, dimmed | "Can't reach Anthropic" |
| Response format changed | last value, dimmed | "Usage format changed" (backoff 30 min) |
| Claude Code Only, no data yet | hollow ring with `!` | "Waiting for Claude Code…" |
| Limit locked | full red ring | "Session limit reached: …" |
| Reset time passed | that window shows 0% until the next update | – |

Background runs never show toasts.

## Caveats

- **The usage API is undocumented.** It may change or disappear at any time. If that happens, the ring keeps the last value and shows "Usage format changed". Connecting Claude Code makes you independent of it.
- **Not affiliated with Anthropic.** The extension only reads usage numbers. It makes no model requests, and sends your token nowhere except `api.anthropic.com`.
- macOS hides menu bar items when the menu bar is crowded. If the ring vanishes, free up space or use a menu bar manager.

## Troubleshooting

- **"Paused by Anthropic"**: the API is rate-limiting your account. Connect Claude Code, and the ring keeps updating while you work.
- **Connected, but "Last update: Never"**: send any message in Claude Code. Status line data appears after the first reply of a session.
- **Ring shows `!`, "Not logged in"**: run `claude`, then `/login`.
- **"Keychain access denied"**: run the command again and click **Always Allow**. You can also open Keychain Access, find `Claude Code-credentials`, and add Raycast under *Access Control*.
- **Ring never updates**: open Raycast Settings → Extensions → Claude Usage Ring and check that background refresh is enabled.

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
├── usage-menu-bar.tsx   # Claude Usage Ring (menu bar)
├── check-usage.tsx      # Check Claude Usage (list view)
├── connect-claude-code.tsx  # Connect Claude Code (status line bridge)
├── types.ts
└── lib/
    ├── claude-code-source.ts  # reads ~/.claude/usage-ring.json
    ├── bridge.ts        # installs / removes the status line script
    ├── credentials.ts   # Keychain / file, read-only
    ├── usage-api.ts     # fetch + defensive parsing + UsageSource
    ├── use-usage.ts     # shared hook: cache-first snapshot + refresh
    ├── refresh.ts       # pure refresh state machine: sources, backoff, throttle
    ├── usage-store.ts   # Raycast Cache wrapper (snapshot only, never the token)
    ├── view.ts          # pure deriveView(): icons, labels, banners
    ├── ring.ts          # SVG ring renderer
    └── format.ts        # percent / reset time / plan formatting
```

### Icon approach (Phase 0 spike)

The menu bar icon is passed as `{ source: { light, dark } }`, where each value is a base64 SVG data URI. The 36×36 viewBox is drawn at 2× for Retina. If a future Raycast version stops rendering SVG data URIs, fall back to writing the SVG to `environment.supportPath` and passing the file path, or to pre-rendered bundled PNGs (see the plan).

## License

MIT
