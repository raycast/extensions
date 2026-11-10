# Fantasy Premier League Rankings Changelog

## [New Commands] - 2026-10-16

- Add My Team, Price Changes, Search Players, Fixtures, Gameweek History, Live Points in Menu Bar and Open My Team commands
- Replace View My Rankings with Mini-Leagues: every classic league with rank movement, paginated standings and any rival's team
- Ask for the Team ID inside the commands that need it, with the extension preference still taking precedence
- Read the FPL API with `fetch` and drop axios

## [Maintenance] - 2026-03-16

- Update axios to ^0.30.3 to address CVE for denial of service via `__proto__` key in `mergeConfig`

## [Bug fixes] - 2024-03-09

- Now uses EPL's API directly.
- Added a missing dependency that was causing player data to be empty on initial render.

## [Initial Version] - 2023-01-18

Initial version code
