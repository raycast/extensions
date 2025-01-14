# svgl Changelog

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