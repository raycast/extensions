# SF Symbols Changelog

## [Fix SF Symbols 27.0 Crash] - 2026-11-23

- Fixed a `write EPIPE` crash on Macs with SF Symbols older than 27.2. The extension now checks the app's version instead of only looking for its command-line tool, and falls back to the bundled symbol list until SF Symbols 27.2 is installed.

## [SF Symbols 27.2 CLI, AI Suggestions, Families, and Export] - 2026-11-21

- With SF Symbols 27.2 or later installed, the catalog comes from the app itself: every current symbol (about 900 more than the bundled list), Apple's categories and tags, and per-platform availability.
- Search uses Apple's own matcher, so "delete" finds `trash` and pasting a symbol glyph finds its name.
- Symbol images are rendered on your Mac instead of downloaded, so new symbols have images too.
- Added AI Suggestions: descriptive searches like "write with pen" ask Raycast AI for related words and show matching symbols in their own section. Needs Raycast AI; turn it off in preferences.
- Variants are grouped into families (`trash`, `trash.fill`, `trash.circle`… show as one tile). Use Show Family to see them all, or Show All Variants to ungroup.
- Added Show Info (⌘I): the symbol in each rendering mode it supports, availability per mode and platform, code point, categories and tags.
- Symbols with Apple usage restrictions show an info badge; hover it to read the restriction.
- Added Rendering Mode… (Monochrome, Hierarchical, Multicolor) and Weight… to change how the grid draws symbols. The Multicolor category shows symbols in color.
- Added View as List (⌘L), with a sidebar (⇧⌘D) showing each symbol's code point, family, availability, categories and tags. View as Grid (⌘G) switches back, and Grid Size… changes the tile size.
- In the list, a badge marks symbols that belong to a family. With the sidebar hidden, rows also show the symbol's availability, its family size, and a New tag.
- Each category has its own color, shared by the category menu and the category tags.
- In Multicolor, symbols with multicolor artwork take your accent color, as in the SF Symbols app.
- Sort by… orders the list by SF Symbols order, by name, or into one section per category.
- In Hierarchical and Multicolor, list and grid symbols update when you switch between light and dark appearance, without reopening the command.
- Search SF Symbols takes an optional search term, so Tab after the command name, or a quicklink, opens it already searching.
- Show Info and the list sidebar say when a symbol is pinned, and a family view lists pinned members first, with a thumbtack.
- AI Suggestions stays quiet when the search text names nothing, such as random letters.
- Pin Symbol and Unpin Symbol use Raycast's standard shortcut, ⌘., and Clear Recently Used Symbols is now ⌃⇧X, since ⇧⌘R opens Rendering Mode….
- Pin actions use the thumbtack icon.
- Added Export Symbol, Export Symbol Size…, Export Symbol Weight…, Export Symbol as… (PNG, PDF, SVG template), Export Family, and Copy Image, with preferences for size, weight, rendering mode, color and folder.
- The OS version below each symbol is now off by default; hover a symbol to see its availability on every platform.
- The Show Recent Symbols preference now hides the Recently Used section.
- Without SF Symbols 27.2, the extension keeps working from the bundled list.

## [Bugfix] - 2025-02-26

- Fixes an issue that caused the extension not to load with pinned and recently used symbols from a previous version

## [UI/UX Improvements] - 2025-02-21

- Added confirmation dialog with destructive style when clearing all recent symbols.
- Improved action styling with destructive indicators for removal actions.
- Standardized keyboard shortcuts for pin/unpin actions to ⇧⌘P.
- Removed success toasts for less notification noise.
- Removed `Clear All Pinned Symbols` and `Remove Recent sfsymbol` actions.
- Renamed the `Clear All Recent Symbols` action to `Clear Recently Used Symbols`.
- Renamed the `All Symbols` section to `Results` with symbol count and the `Recent Symbols` section to `Recently Used`.

## [SF Symbols 5 and 6] - 2025-02-13

- Added SF Symbols added in SF Symbols 5 and 6
- Removed the option to pick between beta and release version of SF Symbols. Instead, the minimum OS version for each symbol is now shown. By default this is iOS, you can change this to any OS you want in the extension settings
- Full symbol names are now shown when you hover over a symbol icon

## [Keyboard Shortcut Improvements] - 2024-10-07

- Now the copying the symbol and the name of the symbol have different keyboard shortcuts
- The same goes for the pasting the symbol and the name

## [Grid View and Filtering] - 2022-05-15

- Switched to Grid View
- Filter symbols by category
- Switch between Stable and Beta Release
