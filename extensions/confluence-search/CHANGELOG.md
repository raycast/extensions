# Confluence Changelog

## [Maintenance] - 2025-06-19

- Get rid of `use-async-effect` dependency
- Use the npm official registry
- Bump all dependencies to the latest

## [Modernize Extension + Fix People Panel] - 2025-03-12

- fix: "Popular" would error out if no popular items in feed
- fix: "People" would error out during search
- `usePromise` hook in "Switch Site" for proper loading and control
- `usePromise` hook in "People" for proper loading and control
- `usePromise` hook in "Search" for proper loading and control
- opt for `cross-fetch/polyfill` instead of a custom polyfill as Ray CLI fails on GitHub
- modernize extension: update deps + use hooks in some places

## [Bug fix] - 2023-11-19

- Fixed a bug causing the People panel to not open

## [Update] - 2023-03-01

- Complete makeover of the confluence extension
- Add `Search` allowing you to search all pages/blogs
- Add `Popular` command to view a list of what's trending
- Add `People` command to search for people
- Add `Go` command to quickly jump to useful places in Confluence
- Add `Recent` command for super snappy access to pages you've viewed
- Add `Create Page`, `Create Blog`
- Add `Switch Site` command to allow to change connected Confluence site

## [Update] - 2023-02-09

- feat: add confluence filter by type, support page, blog, attachment.
- feat: default only search page, [#4340](https://github.com/raycast/extensions/issues/4340)
- fix: [#4523](https://github.com/raycast/extensions/issues/4523)
- feat: upgrade raycast/api to 1.47.3

## [Update] - 2023-02-07

- fix: fix user icon not working
- feat: add page type icon show
- feat: show page's space name

## [Update] - 2022-05-15

- Added "unsafe https" option
