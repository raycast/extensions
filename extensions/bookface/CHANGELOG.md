# Bookface Changelog

## [New commands and YC CLI 0.0.14 support] - 2026-06-23

- Added a `Log out of YC` command that clears stored YC CLI credentials (with a confirmation prompt).
- Detect when the YC CLI is too old to run and route to an in-app **Update Required** screen that runs `yc update` for you, instead of failing with a raw error.
- Render Knowledge Base articles in search results (previously dropped silently).
- Show what the YC agent searched ("What the agent did") beneath each Ask answer.
- Export or copy the full set of search results for a selected type as CSV (`⌘⇧E` / `⌘⇧C`), reaching every match rather than just the displayed page.
- Fixed large searches (e.g. "stripe") returning no results — the CLI's output is now captured reliably regardless of size.
- Added a **Check Again** action to the signed-out screens so you can refresh after logging in, plus a Verbose Logging preference for diagnostics.

## [Initial Version] - 2026-06-08

- Added `Search YC` command — search Bookface across people, YC and non-YC companies, schools, posts, deals, employers, and Startup Library articles, with a type-filter dropdown and per-type secondary actions.
- Added `Ask YC` command — ask the YC agent questions and read the markdown response inline; recent questions are remembered for one-click reuse.
- Added `YC Account` command — show the currently logged-in Bookface user, including their YC companies and batches.
- Added an **Update YC CLI** action (⌘⇧U from any result) that runs `yc update` in place and reports the installed version.
- Wraps the [`yc` CLI](https://bookface.ycombinator.com/cli) for authentication and data access; includes guided empty states when the CLI is missing or the user is not logged in.
