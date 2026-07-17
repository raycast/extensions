# Pins Changelog

## [1.9.0 - Pin Aliases & Per-Group Display Setting] - 2024-07-21

- Added setting for pin aliases.
- Added setting to control how individual groups are displayed in the menu bar dropdown.
- Added support for using information placeholders in pin names.
- Added support for importing multiple pin data files at once.

## [1.8.2 - Group Visibility, Pin Expiration Actions] - 2024-07-11

- Added ability to set custom expiration actions.
- Added visibility setting for groups.
- Added `{{pinName}}` and `{{pinTarget}}` placeholders for getting info about the current pin.

## [1.8.1 - Visibility Setting] - 2024-07-07

- Added visibility setting for pins.
- Added ability to launch pins via deeplinks.
- Fixed timeout error when running AppleScript scripts.

## [1.8.0 - Bug Fixes, More AI Models, & Pin Management Placeholders] - 2024-06-22

- Added support for new Raycast AI models.
- Added setting for configuring the default AI model.
- Added action to open all pins in a group in the "View Groups" command.
- Added `{{createPin:pinName:pinTarget:pinGroup}}` directive for creating new pins.
- Added `{{deletePin:pinName}}` directive for deleting pins.
- Added `{{launchPin:pinName}}` directive for launching other pins.
- Added `{{launchGroup:groupName}}` directive for launching all pins in a group.
- Fixed bug where placeholders using values from LocalData would not update on time.
- Fixed bug where non-document-based applications that expose an Applescript API could yield an error upon LocalData updates.

## [1.7.0 - Target Groups, Media Track Quick Pins, and Bug Fixes] - 2024-01-12

- Added ability to quick-add pins to a target group from the menu bar dropdown.
- Added ability to quick-pin tracks in Music, TV, and Spotify.
- Added support for pin tooltips in the menu bar dropdown. (Does not work in current version of Raycast.)
- Use gpt-3.5-turbo-instruct instead of text-davinci-003 for AI placeholder.
- Fixed bug where non-document-based applications that expose an Applescript API could yield an error.

## [1.6.0 - Tooltips, Tag Filtering, and New Placeholders] - 2023-12-29

- Now using the placeholders-toolkit package.
- Added pin tags and tag filtering.
- Added ability to edit or copy placeholders by right-clicking on them in the menu bar dropdown. Configured in the extension settings.
- Added placeholder tooltips when editing a pin target.
- Added `{{write to="[path]":...}}` placeholder for writing text to a file.
- Added `{{chooseFile}}`, `{{chooseFolder}}`, and `{{chooseApplication}}` placeholders.
- Added optional `offsets` parameter to the `{{clipboardText}}` placeholder.
- Added ability to use Pin keyboard shortcuts within the 'View Pins' command.
- Added link to the Placeholders Guide in the edit pin form header.
- Adjusted behavior of `{{selectedText}}` placeholder to avoid triggering alert sounds each time the menu is opened.

## [1.5.1 - Bug fixes] - 2023-11-06

- Fixed bug where pins with corrupted data from previous versions would cause themselves and others to disappear after editing. (Resolve SKaplanOfficial/Raycast-Pins4)

## [1.5.0 - Bug fixes & Quality of Life Improvements] - 2023-11-01

- Added group statistics, viewable when editing a group.
- Added action to create a subgroup of the selected group
- Added actions for deleting all pins or groups at once
- Added ability to install example groups separately from example pins
- Added ability to install example groups or pins while there are already pins/groups present. Existing items will be preserved.
- Added `{{timezone}}` placeholder for getting the name of the user's timezone.
- Adjusted `{{alert}}`, `{{dialog}}`, and `{{toast}}` placeholders to accept a `title` argument (e.g. `{{alert title="Example":Message text}}`).
- Fixed bug where editing a pin could cause its ID to be nullified, effectively deleting the pin.
- Fixed bug where inputting web URLs in the target field would prevent the list of 'Open With' applications from properly updating and leaving only a "None" option.
- Fixed bug where empty groups would still get displayed in the menu bar dropdown.

## [1.4.0 - Subgroups, Sorting, Settings, Bug Fixes, and More] - 2023-09-05

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

## [1.3.1 - Bug fixes] - 2023-06-19

- Fixed bug where pins without a group would not be treated as valid pins in some cases
- Fixed bug where "Duplicate" action would overwrite the original pin
- Fixed bug where script placeholders resolving to empty strings would show an error when used as the target of a pin
- Changed "New Pin" to default to Favicon / File Icon instead of "None"

## [1.3.0 - Pinned Terminal Commands, Placeholders, Pin Expirations, and More] - 2023-06-16

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

## [1.1.0 - Minor Improvements] - 2023-05-22

- Added "Preferred Browser" setting to allow you to choose which browser to open links in
- Added support for tilde expansion in paths
- Added menu items for "Pin This Tab", "Pin This Directory", and "Pin This App"
- Added 'Show "Pin This" shortcut' setting to allow you to hide the "Pin This" items
- Added "Create New Pin" and "Create New Group" actions
- Added "Duplicate Pin" action
- When adding a new pin, the icon dropdown will now show the favicon or file icon of the URL/path

## [1.0.0 - Initial Version] - 2022-10-05
