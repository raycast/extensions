# SABnzbd Changelog

## [Add README] - 2025-04-23

- Add a README file with instructions on how to get started

## [Modernize Extension + Cache Results] - 2024-09-02

### Enhancements

- "Change Complete Action" is now a `no-view` command
- New `Show Warnings` command
- Add caching via `useCachedPromise`
- Add CHANGELOG
- Update all icons to prefer Raycast Icons
- Add shortcut to Delete Action in "Show Queue"
- Add more toasts

### Dev

- more robust Error Handling by also checking the result of function
- replace `moment` with `dayjs`
- instead of set of `useState`, `mutate` of `useCachedPromise` is passed down to relevant children allowing optimistic updates, proper "isLoading" and maintained Cache

## [Add Job Moving] - 2021-11-18

## [Initial Version] - 2021-11-04