# Bear extension

Search for [Bear](https://bear.app/) notes and open them in Bear. Other features of the extension:

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
  - Converted with [commonmark.js](https://github.com/commonmark/commonmark.js/), which is not fully compatible with Bear markdown compatibility mode/polar. But Bear will switch to commonmark when they ship their [new editor](https://bear.app/panda/) in Bear
  - Embedded files will be converted to `file://path/to/file.txt` links to the locally stored files and open in Finder when clicked. Do **not change** the files, only view/copy them
  - Embedded images will be converted to markdown images embeds `![](~/path/to/image.png)` which point to the image file locally on your file system

<https://user-images.githubusercontent.com/110275/138562591-f1d6c60e-0328-4133-a5fc-427ce963b568.mov>
