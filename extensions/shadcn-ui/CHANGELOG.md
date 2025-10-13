# shadcn/ui Changelog

## [Fix search examples and components commands] - 2025-06-05

- Fix "search components" command by removing dependency on the deprecated /api endpoint and fetching data directly from GitHub
- Fix "search examples" command by updating the GitHub examples path in configuration to match the latest shadcn/ui repo structure

## [Update shadcn/ui add component command] - 2024-09-11

- Updated Add Component command from `npx shadcn-ui@latest add {component}` to `npx shadcn@latest add {component}`

## [Update to shadcn/ui January 2024 version] - 2024-01-15

- Added Remix Dark Mode to Search Documentation
- Added "Open in Github" Action to Search Examples
- Changed Copy Add Component [Pnpm] to cmd + ctrl + p (Was reserved by Raycast)
- Added constant for Error Toast Options
- Updated Search Examples to use useCachedPromise

## [Update to shadcn/ui November 2023 version] - 2023-11-11

- Added a couple missing documentation links
- Updated "Add Component" commands to use @latest
- Added support for Bun to "Add Component" commands

## [Update to shadcn/ui August 2023 version] - 2023-08-19

- Update README.md - updated header and add badges
- Update documentation - New Dark Mode section and components.json page

## [Update to shadcn/ui July 2023 version] - 2023-07-24

- Update README.md - new author personal site link
- Update documentation - New Installation section

## [Update to shadcn/ui June 2023 version] - 2023-06-22

- Update Icon
- Update metadata
- Update README.md
- Fix broken components search and details
- Update documentation

(shadcn/ui changelog)[https://ui.shadcn.com/docs/changelog]

## [Initial Version] - 2023-06-06

- Add search components command
- Add Search Component Open in browser action
- Add Search Component Copy Add Command [npm]
- Add Search Component Copy Add Command [yarn]
- Add Search Component Copy Add Command [pnpm]
- Add search documentation command
- Add Search Documentation Open in browser action
- Add search examples command
- Add Search Examples Open in browser action
- Add Toast feedback to Warn users in case of failed requests
