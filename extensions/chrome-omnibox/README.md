<h1><img src="media/header.svg" width="352" height="56" alt="Chrome Omnibox"></h1>

Your browser's address bar, one hotkey away — in [Raycast](https://www.raycast.com).

![Platforms: Windows and macOS](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue)

Press a hotkey, type a site or address, and press **Enter**. History matches open in your browser; anything else becomes a Google search. No aliases or quicklinks to maintain.

[![Type ray in Open Site and open Raycast in Chrome, with cached favicons shown](media/workflow.gif)](media/workflow.gif)

Recorded with a separate Chrome demo profile and sample history.

- **Smart ranking:** site prefixes first, then word and substring matches, weighted by frequency and recency.
- **Automatic setup:** uses the most recently updated history among supported browsers and profiles.
- **Local history:** history and favicons stay on your machine. Opening sites and Google searches uses your browser.

## Setup

In **Raycast Settings → Shortcuts**, find **Chrome Omnibox → Open Site** and assign a global hotkey. Older versions use **Settings → Extensions**.

Try **⌃⌥⌘L** on macOS (shown above) or **Ctrl+Alt+Space** on Windows. Choose a shortcut that does not conflict with your apps or Raycast's launcher. See [Raycast's hotkey guide](https://manual.raycast.com/command-aliases-and-hotkeys).

## Supported browsers

| | Windows | macOS |
| --- | :---: | :---: |
| Google Chrome (Stable, Beta, Dev, Canary), Chromium | ✓ | ✓ |
| Microsoft Edge, Brave, Vivaldi, Yandex Browser | ✓ | ✓ |
| Opera, Opera GX, Comet, Helium, Cốc Cốc | ✓ | ✓ |
| Arc, Dia, ChatGPT Atlas, Iridium | | ✓ |
| 360 Speed (X), QQ Browser, Sogou Explorer | ✓ | |

Missing yours? Open an issue with the browser name and its `chrome://version` → *Profile Path*.
