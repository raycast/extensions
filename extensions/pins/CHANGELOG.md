# Pins Changelog

## [Bug fixes] - 2023-06-19

- Fixed bug where pins without a group would not be treated as valid pins in some cases
- Fixed bug where "Duplicate" action would overwrite the original pin
- Fixed bug where script placeholders resolving to empty strings would show an error when used as the target of a pin
- Changed "New Pin" to default to Favicon / File Icon instead of "None" 

## [Pinned Terminal Commands, Placeholders, Pin Expirations, and More] - 2023-06-18

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
