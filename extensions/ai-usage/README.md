# AI Usage

Every Claude Code and Codex limit in one keyboard-first dashboard — and a notification *before* you hit the wall.

Press your hotkey, read every limit at a glance, press `esc`, get back to work. No tabs, no dropdowns,
no menu bar round-trip. Everything is on one screen at once.

Each row carries a progress ring, coloured green, amber or red as you approach the limit, with the
percentage repeated as a tag so the state never depends on colour alone.

```
Claude Code                                      Max · updated just now
  ◕  Session          reset 1h 42m                             66%
  ◕  Weekly           reset 2d 13h                             67%

Codex                                            Pro · updated just now
  ○  Weekly           reset 6d 02h                              1%
```

`⌘C` copies a plain-text version, where a bar stands in for the ring:

```
Claude Code
  Session         ██████████░░░░░  66%  reset 1h 42m
  Weekly          ██████████░░░░░  67%  reset 2d 13h
  Weekly · Fable  ██░░░░░░░░░░░░░  12%  reset 2d 13h
```

## Why this exists

Other usage trackers show you where you stand *when you go and look*. This one tells you
when it matters, so you find out you are at 90% before a long run dies halfway through
rather than after.

## Commands

**Show AI Usage** — the dashboard. Session, weekly and per-model windows for every provider, together.

| Key | Action |
|-----|--------|
| `↵` | Refresh |
| `⌘D` | Show or hide per-model limits |
| `⌘C` | Copy a plain-text summary |
| `⌘,` | Preferences |

**Monitor AI Usage** — a background command that checks your limits and notifies you when a
threshold is crossed. Each threshold fires exactly once per limit window, and re-arms automatically
when the window resets. It also keeps a live summary in Raycast's root search, so you can see your
usage without opening anything.

> Raycast starts background refresh **disabled** until a command has been run once. Open
> **Monitor AI Usage** a single time to activate it.

## Preferences

- **Providers** — show or hide Claude Code and Codex individually
- **Notifications** — Raycast HUD, macOS Notification Center, or both
- **Session thresholds** — default `50, 75, 90, 95`
- **Weekly thresholds** — default `75, 90`
- **Reset warnings** — minutes before a reset, default `30, 10`. Only fires on a window you have
  actually used. Leave empty to disable.

Threshold fields are comma-separated percentages. An empty field means "never notify"; an
unparseable one falls back to the defaults rather than going silent.

## How it reads your usage

The extension shows the usage of **your own account, on your own machine**. It reads the credentials
already stored locally by the tools you have installed, and asks each provider for your current
rate-limit status:

| Provider | Credentials | Endpoint |
|----------|-------------|----------|
| Claude Code | `~/.claude/.credentials.json`, falling back to the macOS Keychain item `Claude Code-credentials` | `GET https://api.anthropic.com/api/oauth/usage` |
| Codex | `~/.codex/auth.json` | `GET https://chatgpt.com/backend-api/wham/usage` |

`CLAUDE_CONFIG_DIR` and `CODEX_HOME` are honoured if set.

**Credentials are read, never written.** The extension does not refresh, rotate, or store your
tokens anywhere. This is deliberate: refresh tokens rotate on use, so refreshing one here would
invalidate the copy the CLI holds and sign you out. If a token has expired, the dashboard tells you
to run `claude` or `codex` once instead of trying to repair it.

No browser cookies are read, no web pages are scraped, no data leaves your machine except the
request to the provider you are already signed in to. There is no analytics or telemetry of any kind.

## Requirements

Claude Code and/or Codex installed and signed in. Neither is required — if only one is present, only
that one is shown; if a provider is unavailable, the other still renders normally and the failing one
explains itself in place.

## Development

```sh
npm install
npm run dev     # opens the extension in Raycast
npm test        # parser and threshold unit tests
npm run lint
```
