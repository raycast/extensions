# Pins Changelog

## [Subgroups, Sorting, Settings, Bug Fixes, and More] - 2023-09-05

- Added ability to create subgroups
- Added ability to automatically sort pins using various criteria on a per-group basis
- Added ability to pin text fragments that will be copied to the clipboard when clicked
- Added Quick Pin for pinning the currently selected text as a text fragment
- Added ability to configure keyboard shortcuts for opening pins
- Added ability to set pin and group icon color
- Added pin statistics based on their creation date, last used date, frequency of use, placeholder usage, average execution time, and more
- Added several new placeholders, including `{{location}}` to get physical location & address data
- Added list item accessories for various pin details, e.g. last used date, times used, etc.
- Added setting to export Pins data in other formats (CSV, TOML, YAML, XML) in addition to JSON
- Added support for importing data from CSV, TOML, YAML, XML, and JSON files
- Added various display settings, e.g. show/hide list item accessories, show/hide inbuilt menu items, customize color of the main menu bar icon, etc.
- Fixed error where getting selection from Finder would fail if Finder is inactive (even if a window is open)
- Fixed bug where deleting a group could rearrange pins in other groups
- Fixed bug where moving items up/down could rearrange pins in other groups
- Fixed bug where non-url targets that resemble URLs are sometimes treated as URLs (e.g. "button%20returned:ok" was treated as a URL, now it is not)
- Fixed bug where leaving pin name blank did not use the target as the pin name, despite saying it would
- Fixed bug where the `{{selectedText}}` placeholder caused an alert sound to play if no text was selected

## [Bug fixes] - 2023-06-19

- Fixed bug where pins without a group would not be treated as valid pins in some cases
- Fixed bug where "Duplicate" action would overwrite the original pin
- Fixed bug where script placeholders resolving to empty strings would show an error when used as the target of a pin
- Changed "New Pin" to default to Favicon / File Icon instead of "None"

## [Pinned Terminal Commands, Placeholders, Pin Expirations, and More] - 2023-06-16

- Added per-pin "Open With" setting to allow you to choose which application to open the pin in
- Added per-pin "Expiration Date" setting to automatically remove the pin after a given date & time
- Added support for pinning Terminal commands
- Added additional "Quick Pins" for various actions, e.g. pinning the selected note in Notes, pinning selected files in Finder, pinning current document in Pages/Word, etc.
- Added Placeholder system inspired by PromptLab
- Added action to open the Placeholders Guide in the default Markdown viewer
- Added action to install example pins on first launch
- Added actions for copying pin/group names and URLs
- Added setting to display "Recent Applications" group
- Added setting to hide pins when any of their placeholders are not currently valid, e.g. {{selectedText}} when no text selected
- Added various display settings
- Fixed bug where NEXT_PIN_ID would not be set upon importing data, causing repeated pin IDs
- Fixed bug where pins would attempt to fetch favicons for non-URL targets, causing endless warnings in the console
- Fixed bug where "Pin This Tab" would fail if the tab name contained commas
- Fixed bug where menu bar dropdown would not update after adding pins for the first time

## [Minor Improvements] - 2023-05-22

- Added "Preferred Browser" setting to allow you to choose which browser to open links in
- Added support for tilde expansion in paths
- Added menu items for "Pin This Tab", "Pin This Directory", and "Pin This App"
- Added 'Show "Pin This" shortcut' setting to allow you to hide the "Pin This" items
- Added "Create New Pin" and "Create New Group" actions
- Added "Duplicate Pin" action
- When adding a new pin, the icon dropdown will now show the favicon or file icon of the URL/path

## [Initial Version] - 2022-10-05
