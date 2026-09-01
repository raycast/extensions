# Copy Clear

A Raycast extension for reading copy-sensitive text without confusing similar characters.

Select text in any frontmost macOS application, invoke **Show Selected Text Clearly**, and Raycast displays it in a large, indexed grid. It uses:

- a large character per cell;
- alternating cell backgrounds;
- positional indices under normal characters;
- visible whitespace (`·` for spaces, `⇥` for tabs, and `↵` for line breaks); and
- optional colour coding for letters, numbers, and punctuation.

## Use

1. Select a password, verification code, serial number, URL, or other text.
2. Open Raycast and run **Copy Clear: Show Selected Text Clearly**.
3. Assign a Raycast hotkey to the command for immediate access.

## Development

```bash
npm install
npm run dev
```

Raycast will load the command in development mode. Use `npm run lint` before publishing.

The character-grid concept was adapted from the MIT-licensed [Large Type](https://github.com/raycast/extensions/tree/main/extensions/large-type) Raycast extension.

This project uses the Raycast `getSelectedText()` API, so the source application must expose its current selection to macOS accessibility services.
