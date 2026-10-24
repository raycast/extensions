# Copy on Select

Copy on Select removes the second step from copying text. While the feature is on, a mouse
text selection copies immediately. A drag selection, a double-click, and a triple-click all
work. You do not press `Command-C`.

Run `Toggle Copy on Select` to turn the feature on or off. Assign a Raycast hotkey to the
command for fastest access.

## What the extension runs

Raycast commands start and exit. They cannot watch the mouse continuously. This extension
therefore includes a small background program named `copyonselectd`. The extension starts
that program on the first toggle and copies it to a fixed path first:

```
~/Library/Application Support/CopyOnSelect/copyonselectd
```

The path is fixed because macOS attaches privacy permissions to a program path. The
extension directory changes at every update. A fixed path keeps your permissions valid.

The extension verifies the SHA-256 checksum of the program before every start. The full
source of `copyonselectd` is public, and `scripts/build.sh` in the repository rebuilds it.

## Permissions

macOS asks for two permissions the first time you turn the feature on.

| Permission | Reason |
|---|---|
| Accessibility | Reads which element has focus, to identify a real text selection and to reject password fields. Posts the copy command. |
| Input Monitoring | Observes mouse button and drag events, to recognize a selection gesture. |

Screen Recording is **not** required. Do not grant it.

## Privacy

- The program never reads the text that you select.
- The program never reads the clipboard contents.
- The program makes no network request.
- The target application performs the copy, exactly as it does for a real `Command-C`.
- The log contains timestamps, state changes, and error codes only.

## Safety behavior

- A password field never triggers a copy. The check examines the focused element and its
  parents.
- An unclear result always cancels the copy.
- An application without usable Accessibility data is skipped. Your clipboard is not
  overwritten by a guess.
- A repeated selection does not copy again, so the clipboard history stays clean.
- An ordinary click, a right-click, a scroll, a window drag, and a file drag are ignored.

## Requirements

- macOS 13 or later.
- Apple Silicon or Intel.

## Links

- Source, documentation, and issues: <https://github.com/m-ghalib/raycast-copy-on-select>
- Privacy statement: <https://github.com/m-ghalib/raycast-copy-on-select/blob/main/PRIVACY.md>
- Security reporting: <https://github.com/m-ghalib/raycast-copy-on-select/blob/main/SECURITY.md>
- Uninstall: <https://github.com/m-ghalib/raycast-copy-on-select/blob/main/docs/uninstall.md>
