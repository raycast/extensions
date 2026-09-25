# Large Type Changelog

## [Fit text in the window] - 2026-09-25

- Fixed text running off the edges of the window in non-indexed mode: it is now scaled to fit and wrapped across lines
- Line breaks in the text are now shown

## [Fix special characters in non-indexed mode] - 2026-09-24

- Fixed text after `&`, `<` or `>` disappearing when not using the indexed display

## [Added Selected Text Viewer] - 2026-06-09

- New command "Show Selected Text" to display the selected text of the frontmost application in large type

## [Added Clipboard Viewer] - 2024-10-18

- Second command to use clipboard directly rather than using a form
- Added an option to use Sans-serif or Monospaced font
- Added option to split text by character and index
- Added option to color code numbers and symbols to help with readability 
- Changed rendering logic to break text across multiple lines if needed
- Updated logo

## [Make Text Bigger] - 2022-03-26

- Text is now displayed as large as the Raycast window;
- Removed option to display italic text due to a Raycast limitation with the SVG renderer;
