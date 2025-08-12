# Brand Icons Changelog

## [Improvements] - 2025-08-12

- Add support for creating social badges through cross-extension
- Bump all dependencies to the latest

## [Bugfix] - 2025-08-04

- Handle error when reading a non-existent file in `makeCopyToDownload`
- Fix `titleToSlug` logics for legacy Simple Icons versions
- Bump all dependencies to the latest

## [Bugfix & Enhancement] - 2025-07-29

- Fix a bug which cannot update icon packs
- Add a field `file` to cross-extension callback values
- Add a new preference option for loading history versions
- Bump all dependencies to the latest

## [Maintenance] - 2025-07-15

- Use [pacote](https://npmjs.com/pacote) for downloading and extracting icons
- Bump all dependencies to the latest

## [Routine Maintenance] - 2025-06-20

- We reached 3300+ icons!
- Update extension icon to liquid glass style
- Update extension screenshots with macOS Tahoe wallpaper
- Bump all dependencies to the latest

## [Routine Maintenance] - 2025-06-04

- Use local vendor instead of simple-icons/sdk
- Add compatibility with Simple Icons v15
- Bump all dependencies to the latest

## [Fixes] - 2025-02-28

- Fix a long prompt issue
- Remove the unused function `aiSearch`
- Bump all dependencies to the latest

## [Maintenance & Improvements] - 2025-02-25

- Add support for viewing release notes
- Add support for copying SVG path
- Replace `execa` with `nano-spawn`
- Bump all dependencies to the latest

## [Chore] - 2025-01-12

- Improve searcher performance with `useMemo`

## [Maintenance] - 2025-01-07

- Use `getIconSlug()` to keep slugs consistent
- Add support for copying icon title
- Move API documentation separate to keep extension homepage tidy
- Add Simple Icons Font to related project list
- Fix vulnerabilities with `npm audit fix`
- Clean redundant dependencies since they're already in `@raycast/api`'s dependencies
- Bump all dependencies to the latest

## [Enhancements & Fixes] - 2024-10-28

- Fix incorrect file path
- Add support for copying font entities

## [Maintenance] - 2024-10-27

- Get ready for the v14 new data structure
- Add support for copying icon title
- Bump all dependencies to the latest

## [Fixes] - 2024-10-16

- Fix the issue where AI search could not be stopped

## [AI & Chore] - 2024-10-14

- Add support for searching icons through AI with Raycast Pro
- Bump all dependencies to the latest

## [Milestone] - 2024-09-22

- We reached 3200+ icons!
- Polish changelog formats
- Bump all dependencies to the latest version

## [Enhancements] - 2024-08-05

- Apply brand color to default copying/opening SVG
- Add preferences for configuring default copying/opening behaviors
- Remove a unused placeholder field from preferences

## [Maintenance] - 2024-07-31

- Bump dependencies
- Use `fast-fuzzy` for searching
- Add support for searching aliases
- Limit memory usage with array slices
- Fix API documentation in readme
- Update screenshots

## [Enhancements] - 2024-06-07

- Optimize load time
- Add new version prompt
- Bump dependencies

## [New Feature] - 2024-05-24

- Add offline support
- Bump [`raycast-cross-extension`](https://github.com/LitoMore/raycast-cross-extension-conventions)

## [Updates] - 2024-05-16

- Implement Raycast Cross Extension Conventions

## [Updates] - 2024-04-30

- Expose search function through `launchCommand`
- Remove unused cache header

## [Updates] - 2024-04-15

- Rename extension name to Brand Icons
- Update feedback links

## [New Feature & Chore] - 2024-04-09

- Add support for configuring the default action on detail view
- Update screenshot of detail view
- Bump all dependencies to latest version

## [Improvements] - 2024-03-24

- Now we reached 3100+ icons!
- Add aliases field
- Update package to ESM
- Use `got` instead of `node-fetch`
- Bump all dependencies to the latest version

## [Improvements] - 2024-03-07

- Apply brand colors to grid view
- Use Raycast built-in tint color API for icons in detail page
- Support clicking slug and hex color fields to copy to clipboard
- Support opening file with a specific application
- Add support entries for new icons and outdated icons
- Add toast message when copying SVG entity
- Add more details to readme
- Drop deprecated `Grid.ItemSize` usages

## [Improvements & Fixes] - 2024-02-28

- Adjust icon size in preview
- Fix CDN links

## [Improvements] - 2024-02-20

- Now we reached 3000+ icons!
- Update screenshots

## [Initial Version] - 2024-01-12

- Over 2900 SVG icons for popular brands. See them all on one page at https://simpleicons.org. Contributions, corrections & requests can be made on GitHub.
