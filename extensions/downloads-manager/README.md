# Downloads Manager

Search and organize your downloads

## Manage Downloads Shortcuts

Set **Primary Action** to **Copy to Clipboard** in the Manage Downloads command preferences to copy the selected download with Enter, like Raycast's Search Screenshots. The default remains **Open**, which opens files and browses directories.

These shortcuts work in both list and grid layouts, including inside directories:

| Action                                     | macOS             | Windows      |
| ------------------------------------------ | ----------------- | ------------ |
| Primary action (Open or Copy)              | Enter             | Enter        |
| Paste selected download to the focused app | Command+Enter     | Ctrl+Enter   |
| Copy to Clipboard                          | Command+Shift+C   | Ctrl+Shift+C |
| Open file / browse directory               | Command+O         | Ctrl+O       |
| Open With                                  | Command+Shift+O   | Ctrl+Shift+O |
| Quick Look                                 | Command+Y         | Ctrl+Y       |
| Reveal in Finder / File Explorer           | Command+Option+O  | Ctrl+Alt+O   |
| Copy Path                                  | Command+Control+C | Alt+Shift+C  |
| Delete Download (move to Trash)            | Control+X         | Ctrl+D       |

Paste uses the app focused before opening Raycast; its action label includes that app's name when available. The destination app must support pasting files. Copy Path replaces the previous Command+Shift+. / Ctrl+Shift+. shortcut.

## Delete Latest Download via Deeplink

Use a background deeplink to delete the latest download without focusing Raycast:

```sh
open -g 'raycast://extensions/thomas/downloads-manager/delete-latest-download?launchType=background'
```

Trash mode runs immediately. Permanently Delete mode requires approving a foreground deletion before background deletion is enabled; after that approval, the background deeplink can permanently delete without showing a prompt. Foreground permanent deletion still asks for confirmation every time. Canceling a foreground permanent deletion disables background permanent deletion until the next foreground approval. Use the Toggle Deletion Behavior command to switch between Trash and Permanently Delete.
