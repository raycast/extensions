# svgl Changelog

## [Fixes & Improvements] - 2026-07-06

- Fix URL encoding in the "Request SVG Logo" form — form values with special characters no longer break the generated GitHub issue URL.
- Fix HTTP error handling in SVG fetching — a failed fetch (e.g. 404) now throws an error instead of silently caching bad content.
- Fix misleading wordmark action titles — renamed "Copy SVG Wordmark File" to "Copy SVG Wordmark Text" to reflect the actual behavior.
- Fix shadcn/ui registry slug generation — titles with accents or punctuation are now properly normalized before building the install command.
- Fix cache parsing — corrupted cache entries are now cleared and refetched instead of crashing the command.
- Fix `Svg` type to match the SVGL API — `wordmark` and `brandUrl` are now optional fields.
- Fix Windows-safe filenames — characters invalid on Windows (`:`, `?`, `"`, etc.) are sanitized before writing the temp SVG file.
- Add platform-specific keyboard shortcuts — action shortcuts now define separate `macOS` and `Windows` bindings.
- Add stable `Grid.Item` keys — grid items now use `svg.id`-based keys instead of array indices for more reliable focus behavior.
- Improve wordmark actions visibility — wordmark action sections are now hidden for SVGs that have no wordmark.

## [Feature] - 2026-04-06

- Added Copy as Astro Component action

## [Add shadcn/ui Registry Features] - 2025-09-29

- Add the action `Copy shadcn/ui Registry Install Command` to copy the install command to the clipboard.
- Add the command `Setup shadcn/ui Registry` to copy the `svgl` registry JSON to the clipboard and open docs.
- Add the preference `Default Package Manager` to choose `pnpm`, `npm`, `yarn`, or `bun` for the install command.
- Add the default action option `Copy shadcn Registry`.

## [Update] - 2025-08-08

- Add the script to prefix the SVG IDs to avoid conflicts with other SVGs.

## [✨ AI Enhancements] - 2025-04-02

AI Tools to:

- Get SVG Logo
- Get SVG Component

## [Update] - 2025-03-27

- Added a default action preference that allows users to choose the default action when selecting an SVG.

## [Update] - 2025-02-21

- Updated the SVG logo request form.
- Added the action `Visit SVG Brand Website` to open the SVG brand website in the browser.
- Added the action `Copy SVG File` to copy the SVG as a file to the clipboard.

## [Add Angular Component Feature] - 2025-01-10

- Add the action `Copy Angular Component` to copy the Angular component code to the clipboard.
- Remove duplicate action shortcuts.

## [Add Copy Vue & Svelte Component Feature] - 2024-11-04

- Add the actions `Copy Vue Component` and `Copy Svelte Component` to copy the Vue and Svelte component code to the clipboard.

## [Add Copy SVG URL Feature] - 2024-09-17

- Add the commands `Copy SVG URL` and `Copy SVG Wordmark URL` to copy the SVG URL to the clipboard.

## [Update API URL] - 2024-08-26

- Update API URL to `https://api.svgl.app`.

## [Fix copy wordmark] - 2024-04-25

- Fix the incorrect URL for the copy wordmark SVG.

## [Big Update] - 2024-04-13

### Pin SVGs

You can now pin SVGs, and they will display at the top of the list in the `All View`.

Additionally, there are some small additions for the pinned SVGs:

- You can use the `Pinned` filter to see only pinned SVGs.
- You can move pinned SVGs up and down the list.
- You can unpin the SVGs if desired.

### Recently Used SVGs

When you copy an SVG's file, React component, etc., it will be added to the `Recently Used` list. You can see the last 12 copied SVGs in the `Recently Used` list, and there is also a filter for this list.

### All View Redesign

The `All View` has been redesigned. It will show pinned SVGs at the top, recently used SVGs second, and all SVGs grouped by their categories in the list below.

### Request SVG

You can use the `Request SVG Logo` command to request SVGs you want to add to the svgl.

### Other Improvements

- The icon count for each category is now shown in the grid section's subtitle.
- Each API call is now cached locally in Raycast, making it faster than before.
- The Grid View now displays the SVGs in a 6-column layout, allowing more icons to be shown simultaneously.
- Remove the category subtitle below the SVG name to make it cleaner.

## [Copy React Component] - 2024-04-10

- Add copy React component feature.

## [SVG Wordmark Features] - 2024-03-18

- Add SVG wordmark copy actions.
- Fix SVG error in multiple categories.

## [Initial Version] - 2023-12-14
