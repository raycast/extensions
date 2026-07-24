# Reddit Search Changelog

## [Rebuilt on Reddit's Atom feed, new commands, filtering] - 2026-07-24

Reddit blocked anonymous access to its JSON API, which broke the extension. This release rebuilds it on Reddit's public Atom (RSS) feed — the one unauthenticated surface still serving live results — and adds a batch of new features.

### Fixed

- Searches work again. Reddit's JSON endpoints now return 403; the extension reads the Atom feed instead.

### Added

- **Search Subreddits** is now its own command, with subreddit icons, descriptions, and creation dates.
- **Quick Search Subreddit** — a no-view command to search within a subreddit and open the results on Reddit (accepts `macapps`, `r/macapps`, or a pasted URL).
- **Filter loaded results** — after a search, the search bar filters the loaded results locally (instant, no request). Use **New Search** (⌘⇧F) to run a fresh query.
- **Recent searches and favorite subreddits** on the start screen of each command.
- **Results caching** (5 minutes) so repeating a search is instant and costs no request; **Refresh** (⌘R) fetches fresh results.
- **Sort by icon** in the dropdown (Relevance, Hot, Top, Latest, Comments), settable before searching and sticky across reloads.
- **Copy actions** — Copy Post URL, Copy Post as Markdown, Copy Subreddit Name, Copy Subreddit URL.
- **Show/Hide Sidebar** and a full-screen **View Post** detail.
- Relative timestamps ("5m ago") on results.

### Changed

- Because Reddit's feed is rate limited to roughly one request per minute, searching now runs on **⏎** rather than as you type, with a live cooldown shown across all commands.
- Default results per search raised to **50** (a larger fetch costs the same single request and is cached, so you can filter over more).
- Modernized the toolchain (ESLint 9, Prettier 3, native `fetch`).

## [Initial Version] - 2022-03-04

- Initial release
