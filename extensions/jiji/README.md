# Jiji — Claude Usage

Watch your [claude.ai](https://claude.ai) usage limits from the Raycast menu bar,
at a glance — no need to open the usage page.

This is a Raycast port of [Jiji](https://github.com/sajdakabir/jiji), the macOS menu-bar app. Where the
macOS app renders claude.ai in a hidden WebView and scrapes the page, the Raycast
extension calls claude.ai's usage API directly with your session cookie.

## What it shows

- **Menu bar:** the Claude spark icon, your **current session** usage (the rolling
  5-hour window), and its reset time — e.g. `11% · 2h`.
- **Dropdown → Weekly:** your **all-models** weekly window plus a row for each
  per-model window claude.ai reports (Opus, Sonnet, Fable, …), each with the time
  until it resets.

Actions in the dropdown: **Refresh** (⌘R), **Open Usage Page**, and **Settings**.

## Setup

The extension needs your claude.ai **session key** to read your usage:

1. Sign in to [claude.ai](https://claude.ai) in your browser.
2. Open devtools → **Application** → **Cookies** → `https://claude.ai`.
3. Copy the value of the **`sessionKey`** cookie (it starts with `sk-ant-sid…`).
4. Paste it into the extension's **Session Key** preference in Raycast.

The session key is stored in Raycast's encrypted preferences and is only ever sent
to `claude.ai`. It never leaves your machine for anywhere else.

## Refresh

The command refreshes in the background about once a minute (Raycast schedules the
exact time to save battery). Use **Refresh** (⌘R) in the dropdown to update now.

## Development

```sh
npm install
npm run dev     # sideload into Raycast (ray develop)
npm test        # vitest unit tests
npm run lint    # ray lint
npm run build   # ray build
```
