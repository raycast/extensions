# JSON Tool

[简体中文](./README.zh-CN.md)

JSON Tool is a one-page Raycast JSON workbench for daily JSON cleanup, inspection, conversion, and querying.

## Features

- Format JSON with 2, 4, or 8-space indentation.
- Minify JSON into a compact single-line string.
- Repair JSON-like text, including comments, trailing commas, unquoted keys, and single-quoted strings.
- Sort object keys recursively.
- Escape and unescape JSON strings.
- Encode and decode Unicode escape sequences.
- Generate a basic JSON Schema from the current JSON.
- Query JSON with JSONPath-style paths such as `nav_menu.home.href` or `items[0].name`.
- Load JSON directly from Raycast Clipboard History.
- Preview JSON with line numbers.
- Read selected text first, then fall back to the current clipboard.

## Usage

Open `JSON Tool` in Raycast.

The main editor is a single shared editing area. Paste or type JSON, choose a tool, then run it. The result replaces the editor content directly.

Useful shortcuts:

- `⌘` `↵`: Run the selected tool
- `⌘` `F`: Format JSON
- `⌘` `M`: Minify JSON
- `⌘` `J`: Repair JSON
- `⌘` `C`: Copy current content
- `⌘` `L`: Open line-numbered preview
- `⌘` `R`: Reload selected text or clipboard
- `⌘` `⇧` `V`: Open JSON clipboard history

## JSONPath Query

Open `Path 查询` from the tool list or action panel.

The JSONPath screen uses Raycast's native dynamic search list:

- Type a path in the search bar.
- Matching paths appear immediately.
- Select a path to preview the query result and the full JSON reference.
- Apply the query result back to the main editor with `⌘` `↵`.

The path input does not require a `$` prefix.

## Clipboard History

Use `JSON 剪贴板历史` in the main screen or press `⌘` `⇧` `V`.

Raycast's API can read the most recent 6 clipboard history entries through offsets `0` to `5`. JSON Tool filters those entries and only shows valid JSON items.

## Development

```bash
npm install
npm run dev
```

Validate before publishing:

```bash
npm run build
npm run lint
```

## Publishing Notes

Before publishing, replace the `author` field in `package.json` with your Raycast Store username.
