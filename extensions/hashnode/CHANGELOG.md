# Hashnode Changelog

## [Pagination 🚀 + More] - 2024-10-16

- Empty View if no Articles Published
- Pagination allows you to doom scroll
- Toggle a `Details` View with Post Brief and Publication Name

## [Migrate API + Cache + Modernize] - 2024-09-03

- fix: extension not working as it was using deprecated API
- `useCachedPromise` in `useStories` lets us gracefully cache the stories and prevent flickering
- major migration of ray and deps
- replaced `best` and `new` with `relevant` and `recent` types based on API changes

## [Initial Release] - 2022-01-24