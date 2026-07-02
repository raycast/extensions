# Claude Gauge

A keyboard-only Raycast dashboard for your Claude usage — subscription limits, local Claude Code spend, and Anthropic API usage — all reachable by hotkey.

**[English](README.md) · [한국어](README.ko.md)**

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor-%E2%9D%A4-db61a2?logo=github&logoColor=white)](https://github.com/sponsors/zzaisang)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue)](./LICENSE)

## Screenshots

| Claude Session | Claude API Usage | Rate-Limit Headroom |
| --- | --- | --- |
| ![Claude Session](media/session.png) | ![Claude API Usage](media/api-usage.png) | ![Rate-Limit Headroom](media/key-status.png) |

## What it does

Two Raycast commands, launched by name or hotkey:

- **Claude Session** — your Claude **subscription** usage: 5-hour & 7-day limits with reset countdowns, a burn-rate summary for the active block, and this week's tokens.
- **Claude API Usage** — Anthropic API tokens & cost. With no key it shows your local Claude Code spend (an estimate); with an Anthropic API key it shows billed organization usage (**admin** key) or rate-limit headroom (**standard** key).

## Install

Not on the Raycast Store yet — run it from source:

```sh
npm install
npm run dev
```

Leave `npm run dev` running, then launch **Claude Session** or **Claude API Usage** from Raycast.

## Setup

- **Claude Session** reads your limits from a small cache your Claude Code status line writes. On first run it shows a one-time **Set Up Status Line** action — click it, run Claude Code once, then press **⌘R**. This is an expected one-time step, not an error. (Requires `jq`.)
- **Claude API Usage** works with no key (local estimate). To see more, open preferences with **⌘,** and add an **Anthropic API key** — an admin key (`sk-ant-admin01-…`) for billed org usage, or a standard key (`sk-ant-api…`) for rate-limit status.

## Preferences

Open with **⌘,** while a command is selected:

- **Anthropic API Key** — optional admin or standard key (stored in the macOS Keychain).
- **Currency** — USD (default) or an approximate KRW conversion with a configurable rate.
- **Monthly Budget (USD)** — draws a cost/budget gauge in API Usage.
- **ccusage Runner** — `npx` (default) or `bunx`.
- **Claude Config Directory** — defaults to `~/.claude`.

## Privacy

Claude Session is entirely local. Claude API Usage only reaches `api.anthropic.com` when you set an API key; your key is stored in the macOS Keychain. Local spend figures are `ccusage` estimates, not your billed invoice.

## Sponsor

Claude Gauge is free and MIT-licensed. If it saves you time, you can support its development:

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor%20on%20GitHub-%E2%9D%A4-db61a2?logo=github&logoColor=white)](https://github.com/sponsors/zzaisang)

## License

[MIT](./LICENSE)
