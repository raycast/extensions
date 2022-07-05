# GIF Search Changelog

## [Fix Tenor bug in Grid view] - 2022-07-05
- Fixes bug where medium-sized Tenor grid gifs weren't animating
- Switches the default layout type to grid
- Default initial state grid items to "small"

## [Add Grid Item Size option] - 2022-06-07
- Adds preference for controlling the Grid Item Size
- Use original gif files when displaying Large Grid items
- Removes "Show GIF Preview" preference. GIF previews are now solid and should always be shown

## [Added Grid Layout Support] - 2022-06-07
- Adds new option to display results in a Grid or a List

## [New Metadata] - 2022-05-09
- Adds a new icon
- Adds metadata to list items

## [Added new action] - 2022-04-25
- Adds a new action to copy as Markdown

## [Show "Recent" GIFs] -2022-04-13
- Adds a new "Recent" section that shows GIFs you recently performed an action on (excluding Favorites)
- Sorts Recents and Favorites by most recently used or fav'd
- Limits "Recents" and "Favorites" in initial views to 1/2 of the max result count

## [Add unified GIF search command & adding to favorites] - 2022-04-09
- Breaking: Remove separate service commands in favor of the one unified "Search for GIFs" command
- New: Unified "Search for GIFs" command that searches across GIF services
- New: Save GIFs as Favorites
- New: Favorites view to see and search favorite gifs across all services
- New: Preference for max number of search results (defaults to 10)
- Fix: Use gif slug as file name when copying file to clipboard
- Fix: Add section dividers to GIF Details Actions
- Fix: Add custom Empty States for Finer GIFs Club and Favorites view

## [Remove static GIF preview warning 🎉] - 2022-04-06
- Removes the warning about GIFs no longer animating, Raycast v1.32.0 supports GIFs in Details
- Update GIF preview preference to be enabled by default
- Reorder the default actions order based on user feedback

## [New GIF Details View with Metadata] - 2022-03-30
- Adds a GIF Details page that displays GIF metadata
- Fixes the jumpiness when jumping between GIF previews by giving all gifs a static 200px height
- Changes the attribution image based on the theme environment to enhance readability
## [Improved Experience] - 2022-03-22
- Giphy and Tenor keys no longer required, downloads shared keys by default
## [New Customizations & New GIF Search Engine] - 2022-03-21
- Adds support for copying the GIF file itself (instead of the URL) to the clipboard via AppleScript
- Adds a "Secondary Action" preference to change the action on CMD + ENTER
- Adds a new command to search for GIFs from The Finer Gifs Club

## [New Features] - 2022-03-10
- Add GIF Preview Setting
- Add Default Action Customization
- Add Copy Page URL Option
