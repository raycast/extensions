# Bookface Changelog

## [Initial Version] - 2026-06-08

- Added `Search YC` command — search Bookface across people, YC and non-YC companies, schools, posts, deals, employers, and Startup Library articles, with a type-filter dropdown and per-type secondary actions.
- Added `Ask YC` command — ask the YC agent questions and read the markdown response inline; recent questions are remembered for one-click reuse.
- Added `YC Account` command — show the currently logged-in Bookface user, including their YC companies and batches.
- Added an **Update YC CLI** action (⌘⇧U from any result) that runs `yc update` in place and reports the installed version.
- Wraps the [`yc` CLI](https://bookface.ycombinator.com/cli) for authentication and data access; includes guided empty states when the CLI is missing or the user is not logged in.
