# FreshRSS for Raycast

Browse, search and manage your FreshRSS articles directly from Raycast.

## Setup

1. Make sure you have a FreshRSS instance running
2. In FreshRSS, go to **Account settings** → **API** and enable the API
3. Generate an **API password** (this is separate from your login password)
4. In Raycast, open the extension preferences and fill in:
   - **FreshRSS Base URL** — e.g. `https://rss.example.com`
   - **Username** — your FreshRSS username
   - **API Password** — the API password you generated
   - **Debug Logging** — optional; enable this if you want extra request logs while debugging the extension

## Commands

| Command              | Description                                        |
| -------------------- | -------------------------------------------------- |
| **Browse Articles**  | Browse, search and manage articles with status and period filters |
| **Today's Articles** | Quick access to today's unread articles            |
| **Starred Articles** | Browse your bookmarked articles                    |
| **Random Article**   | Discover a random unread article                   |
| **Feed List**        | Browse subscriptions and read articles by feed     |

## Actions

- **Enter** — Read article in full-screen detail view
- **Cmd+U** — Mark as read / unread
- **Cmd+S** — Star / unstar
- **Cmd+R** — Refresh
- **Cmd+Shift+C** — Copy article URL
- **Cmd+Shift+O** — Open FreshRSS in browser
