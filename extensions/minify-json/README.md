# Minify JSON

A [Raycast](https://raycast.com/) extension that parses JSON, minifies it (or
formats it), and copies the result to the clipboard.

## Features

- **Minify** — collapses the JSON onto a single line.
- **Pretty print** — toggle to format JSON with two-space indentation instead.
- **Clipboard prefill** — auto-loads the current clipboard contents on launch,
  so you often don't need to paste.
- **Inline result** — shows the output in the form and lets you re-copy it with
  ⌘⇧C.
- **Validation** — surfaces malformed input with a failure toast.

## Usage

1. Open **Minify JSON** in Raycast.
2. Paste JSON (or let it prefill from your clipboard).
3. Press **⌘⏎** (_Minify_) to copy the result.
4. Toggle **Pretty print** if you want indented output instead of minified.

## Development

```sh
pnpm dev     # run the extension in Raycast dev mode
pnpm build   # production build
```

Lint and formatting are managed from the workspace root — see the [root
README](../README.md).
