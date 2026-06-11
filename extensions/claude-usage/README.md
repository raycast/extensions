# Claude Usage — Raycast Extension

Monitor your **Claude subscription** limits (Pro / Max / Team) right in the macOS menu bar and as a Raycast dashboard. It reads your **local Claude Code login** from the macOS Keychain — **no API key, no cookie to paste**.

> Shows the same server-side subscription utilization you see on `claude.ai/settings/usage` — not token/API billing.

## What you see

**Menu bar** (default: `42% · 13%`)

- Session utilization (5-hour window) and weekly utilization side by side
- Icon color by severity: green < 50 % < yellow < 75 % < orange < 90 % < red
- In the dropdown: progress bars, reset countdown + time, Opus/Sonnet sub-limits (if your plan has them), burn rate and projection

**Dashboard** (`Show Dashboard`)

- Every window with a detail panel: status, reset, burn rate (%/h), "limit reached in ~…" / "projected at reset"
- Weekly pace vs. budget (~14.3 %/day)
- Extra-usage credits (if enabled)

## Requirements

- macOS
- [Raycast](https://raycast.com)
- The **Claude Code CLI**, logged in with your Pro / Max / Team plan

The extension reuses the OAuth credentials that Claude Code stores in the macOS Keychain on login (item `Claude Code-credentials`) — **read-only**. There's no browser, no `sessionKey`, nothing to enter by hand.

## Setup

```bash
npm install
npm run dev        # requires Raycast installed
```

There's **no key to enter**. On the first refresh the extension reads the OAuth token from the Keychain (`/usr/bin/security`) and calls the usage endpoint.

Then run the **"Show in Menu Bar"** command once → the item appears in your menu bar. Background refresh (every 2 min) has to be enabled once in the command settings after install (standard Raycast behavior).

## Preferences

- **Menu Bar Display** — what the title shows: `Session % · Weekly %`, session only, weekly only, or icon only.
- **Model Sub-Limits** — show Opus/Sonnet weekly limits when your plan exposes them.

## How it works

- **Endpoint:** `GET https://api.anthropic.com/api/oauth/usage` with `Authorization: Bearer <accessToken>`, `anthropic-beta: oauth-2025-04-20` and `User-Agent: claude-code/…` — the same endpoint and headers the Claude Code CLI uses for its own limit display. It is **unofficial and may change**; parsing is defensive (`utilization` *and* `utilization_pct`).
- **Credentials:** read from the Keychain (`Claude Code-credentials`) via `/usr/bin/security find-generic-password -w`. Because the same `security` binary that the CLI uses is on the item's ACL, no Keychain prompt appears — unlike app-created items such as `Claude Safe Storage`.
- **Read-only, no token refresh.** The extension never writes to the Keychain. The access and refresh tokens are shared with the Claude Code CLI; self-refreshing would rotate that shared refresh token and could strand Claude Code's own login if a write-back failed. Claude Code keeps the token fresh through normal use; once it expires, the usage endpoint returns 401 and the UI shows *"session expired — use Claude Code to refresh."*
- **One request per refresh:** usage snapshots are cached for 45 s so the menu bar and dashboard don't double-fetch.
- **Burn rate:** snapshots from the last 6 h live in Raycast's cache; the rate is computed over the last 60 min (min. 8 min of data). History is dropped on a session reset so the rate can't go negative.

## Privacy

Your Claude Code token never leaves your Mac except toward Anthropic's own endpoint. The extension reads it locally and only to display your usage. Note that the token is used **outside** of Claude Code and that `oauth/usage` is an internal endpoint that can change at any time.

## Acknowledgements

The idea of reading the Claude Code OAuth token from the macOS Keychain (instead of scraping a `claude.ai` cookie) comes from **Grant Boufford**'s "Claude Usage" app, built on the Glaze runtime. This Raycast extension is an independent reimplementation of that approach.

Not affiliated with or endorsed by Anthropic.

## License

[MIT](LICENSE) © Arne Brockmann
