# Copy Path

Copy the path of the open folder, selected file or the URL of the current browser tab.

## ✨Feature 1

Copy path of the selected file or the current Finder window.

- Priority detection of the selected files.
- If no files are detected, detect the path of the window where the Finder currently gets focus.
- Support QSpace Pro, including selected items on QSpace Desktop and the current QSpace location.

## Native file pickers and copy tips

- Copy explicitly selected item paths from a focused native Open panel in another application.
- With no readable selection, retain the existing document, browser, and configured unsupported-app behavior. The command does not infer the picker’s current folder or open Go To Folder.
- Multi-item copy tips show the first path and an additional-item count, such as `first.png (+2)`.
- Long paths are shortened for display only; clipboard content remains complete.
- **Show emoji**, grouped under **Copy Tip**, controls decorative emoji. It has no effect while **Show Copy Tip** is disabled.
- QSpace uses its unified window/desktop selection when available, with compatibility for older versions.

## ✨Feature 2

Copy the URL of the current tab of the browser or web app.

- Support Safari, Chrome, Arc, Edge, Brave, Vivaldi, Opera, Orion, SigmaOS and Yandex Browser.
- Support Safari Web App and Firefox browser by using an alternative method, which is not as stable as other browsers.
- Support Arc's Little Arc windows and Peek previews. Arc's scripting dictionary only knows full tabs, so the URL of the focused web area is read through the macOS Accessibility API (Raycast's existing Accessibility permission is enough).

🌟🌟To make it easier and faster to use, it is recommended to set shortcut keys for the extension
