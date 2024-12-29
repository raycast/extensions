# Nextcloud Changelog

## [WebDAV request Fix] - 2024-12-29
- `200 OK` check with each items
- Array check for `item["d:propstat"]`

## [`Show Activity` is now Paginated] - 2024-10-07

### Dev Notes
- Replaced `jsonRequest` with a wrapped `useFetch`
- Turned `useActivity` into a `useFetch`

## [Chore] - 2022-05-02
 - Adds missing icons for activity events

## [Initial Release] - 2022-03-15
 - Added Nextcloud extension