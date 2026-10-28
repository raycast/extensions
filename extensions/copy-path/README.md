# Copy Path

Copy the path of the open folder, selected file or the URL of the current browser tab.

## ✨Feature 1

Copy path of the selected file or the current Finder window.

- Priority detection of the selected files.
- If no files are detected, detect the path of the window where the Finder currently gets focus.
- Support QSpace Pro, including selected items on QSpace Desktop and the current QSpace location.

## Native Open and Save dialogs

- Check the focused macOS file picker before the host app’s document or browser URL.
- Copy selected file paths when exposed by the picker, otherwise its current folder URL.
- If a native picker is detected but its path is unavailable, leave the clipboard unchanged instead of copying the window behind it.
- Uses Raycast’s Accessibility permission. Custom file dialogs and virtual locations such as Recents may not expose a filesystem path.

## ✨Feature 2

Copy the URL of the current tab of the browser or web app.

- Support Safari, Chrome, Arc, Edge, Brave, Vivaldi, Opera, Orion, SigmaOS and Yandex Browser.
- Support Safari Web App and Firefox browser by using an alternative method, which is not as stable as other browsers.
- Support Arc's Little Arc windows and Peek previews. Arc's scripting dictionary only knows full tabs, so the URL of the focused web area is read through the macOS Accessibility API (Raycast's existing Accessibility permission is enough).

🌟🌟To make it easier and faster to use, it is recommended to set shortcut keys for the extension
