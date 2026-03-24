# Linkwarden Changelog

## [Fix Potential Search Errors] - 2026-03-23

- Fixed "Bad Request" error caused by sending empty `collectionId` to the API
- Fixed search text not being URL-encoded, causing malformed requests with special characters
- Added error toast when link fetching fails (previously silent)
- Fixed double-slash in API URLs when instance URL has a trailing slash

## [Add Helium Browser Support] - 2026-01-26

- Added Helium to the list of supported Chromium browsers

## [Improve UX] - 2025-03-10

- Added a success toast when a link is added and pop to root

## [Fix URL Field fill] - 2024-09-16

- Fixed the URL field not being filled when run "Add website to Linkwarden" form

## [Filter Links by Collection] - 2024-09-11

### Enhancements

- Updated Titles and some fields to exactly match the Linkwarden default
- View the Date Modified and Collection of a link
- Filter links by collection
- You can now choose a collection when adding a link

### Dev

- Controlled validation with better error handling in `add`
- Moved some interfaces and some `useFetch` into separate files so that in future it will be easier to pass down those hooks for mutate and repeated calls

## [Fix API Auth] - 2024-08-20

- The API now uses `Bearer` authorization (fix #13613)
- Add an Empty view for no Links
- utilize `mapResult` and `initialData` of `useFetch`

## [Initial Version] - 2024-06-20
