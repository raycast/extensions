# Nextcloud Changelog

## [WebDAV request Fix] - 2025-01-12
- `200 OK` check with each items to prevent future bugs.
- Fix bug where `item["d:propstat"]` can be an object, not an array [#10036](https://github.com/raycast/extensions/issues/10036) & [#5040](https://github.com/raycast/extensions/issues/5040).

## [`Show Activity` is now Paginated] - 2024-10-07

### Dev Notes
- Replaced `jsonRequest` with a wrapped `useFetch`
- Turned `useActivity` into a `useFetch`

## [Chore] - 2022-05-02
 - Adds missing icons for activity events

## [Initial Release] - 2022-03-15
 - Added Nextcloud extension