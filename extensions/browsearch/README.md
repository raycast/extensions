# Browsearch

Search your Firefox browsing history directly from Raycast and open results instantly in a new tab.

## Requirements

- **Firefox** must be installed on your Windows machine and accessible via the command line.
- **Windows** is the only supported platform.

## Features

- **History search** — queries your Firefox `places.sqlite` database ranked by frecency and visit count.
- **URL detection** — if you type a full URL, Browsearch opens it directly instead of searching.
- **Fallback search** — if no history matches, fall back to your preferred search engine.
- **New window** — open any result in a new Firefox window via the secondary action.
- **Privacy** — all data stays on your device. No requests are made to external services; the history database is read locally.

## Setup

No API keys or external accounts are required.

Firefox must be installed at one of the standard Windows locations (e.g., `C:\Program Files\Mozilla Firefox\firefox.exe`). If Browsearch cannot find Firefox, it will show an error with a link to download it.

## Preferences

| Preference | Description |
|---|---|
| **Search Engine** | Fallback engine when the query is not a URL and has no history matches. Supports Google, DuckDuckGo, Bing, or Custom. |
| **Custom Search URL** | Base URL for your custom search engine (e.g. `https://kagi.com/search?q=`). Only used when **Search Engine** is set to Custom. |

## Privacy

Browsearch reads your Firefox `places.sqlite` database from your local profile directory. This file is copied to a temporary location before being queried so Firefox is never locked or interrupted. No browsing data is transmitted anywhere.
