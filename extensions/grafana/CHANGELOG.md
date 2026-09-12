# Grafana Changelog

## [Fix Explore link URL encoding] - 2026-06-19

- Use `encodeURIComponent` for the JSON `panes` query parameter instead of `encodeURI`, which left `{`, `}`, `"`, and `&` unescaped, producing broken Explore URLs.
- Fix double `&&` typo in the query string.

## [New command] - 2025-10-03

- Add a new command Pages to go to the most common pages in Grafana
- Updates dependencies & remove node-fetch from dependencies

## [Updates] - 2024-08-22

- Use Service Account Token instead of API keys

## [New commands] - 2024-04-25

- New command "Create saved query"
- New command "List saved queries"
- Fix typo introduced

## [New command] - 2024-04-19

- New command Explore
- Refactor and update the codebase & packages

## [Refactor and Improvements] - 2022-08-03

Refactor and use new `useFetch` ([#2406](https://github.com/raycast/extensions/pull/2406))

## [Added Grafana Extension] - 2021-12-09

Initial version code ([#464](https://github.com/raycast/extensions/pull/464))
