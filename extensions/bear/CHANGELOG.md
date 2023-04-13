# Bear Changelog

## [Add support for Bear 2] - 2023-04-01

- Add support for Bear 2
- Add _Search Query_ argument to _Search Notes_ command
- Fixed a bug where the _Copy Unique Identifier_ action copied `note.id` instead of the note id

## [Fix crash] - 2022-11-29

- Fix a crash that occurred when a note's text is `null`.

## [Note preview in list view] - 2022-11-24

- Show a preview of the note's content and metadata in the note list view.
- Add a checkbox to the extension preferences for toggling the note preview.

## [Store page improvements and minor internal updates] - 2022-10-03

- Add screenshots
- Add missing contributors
- Update outdated dependencies

## [Make opening notes in edit mode optional] - 2022-10-01

- Add a checkbox to enable or disable "edit mode" when opening notes in Bear. Edit mode places the cursor at the end of the note, which is sometimes desirable, and sometimes not. Previously, notes would always be opened in edit mode. Now, you can disable that behavior by unchecking the checkbox.

## [Close Bear extension after completing some tasks] - 2022-02-22

- Return to the root Raycast view after completing the following tasks:
  - Create Note
  - Add Text
  - Web Capture
  - Grab Note Url

## [Change trash and archive shortcuts] - 2021-11-09

- Change Move to Archive shortcut to <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>x</kbd>
- Change Move to Trash shortcut to <kbd>Ctrl</kbd> + <kbd>x</kbd>

## [Add more actions] - 2021-11-02

- Open in standalone Bear window with <kbd>Cmd</kbd> + <kbd>Return</kbd>
- Move note to archive with <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Backspace</kbd>
- Move note to trash with <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Backspace</kbd>
- Preview note in Raycast with <kbd>Cmd</kbd> + <kbd>P</kbd>
  - Embedded images and files will be converted to `file://path/to/file.txt` links to the locally stored files and open in Finder when clicked. Do **not change** the files, only view/copy them
- Show notes linked from the selected note and backlinks to the selected note with <kbd>Cmd</kbd> + <kbd>L</kbd>
- Copy note text as markdown with <kbd>Cmd</kbd> + <kbd>C</kbd>
  - Embedded files will be converted to `file://path/to/file.txt` links to the locally stored files and open in Finder when clicked. Do **not change** the files, only view/copy them
  - Embedded images will be converted to markdown images embeds `![](~/path/to/image.png)` which point to the image file locally on your file system
- Copy note text as HTML with <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>
  - Converted with [commonmark.js](https://github.com/commonmark/commonmark.js/), which is not fully compatible with bear markdown compatibility mode/polar. But bear will switch to commonmark when they ship their [new editor](https://bear.app/panda/) in Bear
  - Embedded files will be converted to `file://path/to/file.txt` links to the locally stored files and open in Finder when clicked. Do **not change** the files, only view/copy them
  - Embedded images will be converted to markdown images embeds `![](~/path/to/image.png)` which point to the image file locally on your file system

## [Support encrypted notes] - 2021-10-30

- Add support for searching the titles of encrypted notes

## [Initial release] - 2021-10-24

- Initial version of the Bear extension.
