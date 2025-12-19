# TC NO Generator

Generates Turkish national ID numbers (TC Kimlik No) and provides quick actions to copy and save them locally.

Features

- Generate a new TC number and copy it to the clipboard.
- Save the last generated TC and keep a local history (most recent 50 entries).
- View the last generated TC or browse/delete the history.

Commands

- `tc-no-generate` — Generate a new TC number. Use the action panel to copy to clipboard or save as last.
- `last-tc` — Show the last generated TC and quickly copy or open the history.
- `tc-history` — Browse saved TC numbers, copy individual entries, delete single entries, or delete all.

Keyboard shortcuts

This extension uses Raycast's common shortcuts where applicable (e.g. Copy, Save, New, Refresh, Delete). Use the standard Raycast keybindings for those actions (Cmd/Ctrl + ... depending on your platform).

Privacy

All generated values and history are stored locally using Raycast `LocalStorage`. Nothing is sent to any external server.

Development / Testing

1. Open this repository in a code editor.
2. Run the extension in Raycast (use Raycast's developer tools) and try the three commands above.

Notes

If you'd like the README to remain in Turkish or want more examples/screenshots, tell me which language and I'll adapt it.
