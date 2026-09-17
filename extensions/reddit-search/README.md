# Reddit Search

*Search Reddit — posts, subreddits, or within a specific subreddit — right from Raycast*.

## Commands

- **Search Reddit** — search posts across Reddit. Sort by Relevance, Hot, Top, Latest, or Comments; open a post inline, in a full detail view, or on Reddit. Recent searches and your favorite subreddits are one keystroke away from the start screen.
- **Search Subreddits** — find subreddits by name, favorite them for quick access, and jump into one to search its posts or open it on Reddit.
- **Quick Search Subreddit** — a no-view command: type a query and a subreddit (`macapps`, `r/macapps`, or a pasted URL all work) and it opens a subreddit-restricted search on Reddit in your browser.

## How it works

[Reddit blocked anonymous access to its JSON API](https://www.reddit.com/r/modnews/comments/1tq9vxo/protecting_communities_from_scrapers_and_platform/), so this extension reads Reddit's public **Atom (RSS) feed** instead — the one unauthenticated surface still serving live results.

That feed is **rate limited to roughly one request per minute**. To stay within it, the extension:

- **Searches on ⏎, not as you type** — so a query isn't fired on every keystroke.
- **Caches results for 5 minutes** — repeating a recent search (or stepping between views) is instant and costs no request. Use **Refresh** (⌘R) to fetch fresh results.
- **Shows a live cooldown** — when the limit is hit, the search bar and actions display the seconds remaining, shared across all three commands.

If you need the full result set, deeper history, or Reddit's own filters, every view offers **"Show all results on Reddit"** to continue in your browser.

## Preferences

- **Number of results to display (1–100)** — how many results each search returns (default 10).
- **Debug Logging** — enable detailed console logs for troubleshooting.
