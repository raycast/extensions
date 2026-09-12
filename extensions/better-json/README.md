# Better JSON

A JSON workbench for Raycast. Open JSON from your clipboard, browse one level at a time, and copy exactly the content you need.

## Usage

1. Open **Better JSON** in Raycast. Valid clipboard JSON opens directly in the browser, with **Entire Document** selected. Nested JSON strings are automatically deserialized throughout the document before any preview is shown.
2. Select an object or array to preview it, then press `Return` to enter it. `Escape` returns to the previous level and preserves your selection. Raycast clears an active search before going back.
3. Search any field, value, or path across the document. Results show complete paths and the actual match count, so repeated fields such as `id` are distinguishable.
4. Use **Copy Entire Document** or **Copy Current Content**. The copy notification identifies the scope and format.

An unfinished draft takes precedence over the clipboard when reopening the command. Empty or ordinary non-JSON clipboard text opens a clean input form. Malformed JSON-like clipboard text is kept in the form for correction.

## Input and Drafts

- **Edit Input** opens the original source or resumes an unfinished draft. Submit **View JSON** with `Cmd+Return`.
- **Read Clipboard** has the same meaning in the browser and form. Valid JSON opens immediately; invalid content remains editable; an empty clipboard preserves your current work.
- **New Input** opens an empty form. **Clear Input** clears its content and saved draft.
- Edits are saved locally as a single unfinished draft. The form shows whether saving succeeded. Successful submission clears that draft.
- Syntax errors use the text area's native red validation state and `error` message, with line and column information when available. Raycast controls the label and error placement; the extension API does not expose a top-label or below-input-error option. The original input is retained.
- Replacing the document from a nested view returns to the document's top level and removes the old navigation pages.

## Browsing and Search

- The left list contains the current scope and its immediate children; the right panel previews the fully deserialized selection, including all of its nested children.
- Arrays and objects load children in pages of 100.
- Search and type filters cover the entire search index, regardless of the current level. Search matches all space-separated terms against paths, keys, types, and primitive values.
- The index contains at most 3,000 nodes. For larger documents, the interface explicitly labels search as partial. Hierarchical browsing remains available beyond the index limit.
- Previews longer than 40,000 characters are shortened with a visible notice. Copying still includes the complete selected value.
- Empty search results retain actions for clearing search, editing input, reading the clipboard, and copying the entire document.
- The path, source, and conversion mode remain visible. Additional metadata is optional.

## Copying and Conversion

**Copy Current Content** produces valid formatted JSON, including quotes around strings. **Copy Compact JSON** provides the frequent compact-output action directly.

Open **Copy As…** for **Serialize JSON (JSON.stringify)**, a string's plain text without quotes, its path, the compact entire document, or the exact original input. **Paste Current Content to Previous App** remains available as an explicitly named action.

Nested objects, arrays, and repeatedly escaped JSON strings are automatically deserialized until no further JSON layer can be decoded. There is no configured nesting-depth limit; traversal is iterative instead of using the JavaScript call stack. Ordinary strings, numeric/boolean text such as `"123"` and `"true"`, and malformed nested JSON strings remain unchanged. Decoding is independent of the 3,000-node search index limit.

**Serialize JSON (JSON.stringify)** applies one `JSON.stringify` operation to the current decoded value, producing the same compact JSON as **Copy Compact JSON**. It does not stringify each child independently or add a second wrapper around the serialized document. For example, `{ "data": "{\"ok\":true}" }` is decoded to `{ "data": { "ok": true } }` and serialized as `{"data":{"ok":true}}`. An iterative fallback preserves these output semantics for JSON trees deeper than the native stringifier's call stack.

**Restore Original Data Types** switches to the original data. **Deserialize All Nested JSON** re-enables full decoding. **Edit Input** and **Copy As… → Original Input** retain the exact source throughout.

The extension uses a custom 512×512 PNG icon with transparent margins. See [icon design and generation prompt](docs/icon-design.md).

Supported inputs include objects, arrays, primitive JSON values, single-quoted JSON copied from logs, and nested JSON strings such as:

```json
{ "data": "{\"name\":\"Raycast\",\"items\":[1,2,3]}" }
```

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `Return` | Enter the selected container, or copy the current scope/value |
| `Cmd+Return` in the form | View JSON |
| `Cmd+C` in the browser | Copy current content as formatted JSON |
| `Cmd+Shift+C` in the browser | Copy current content as compact JSON |
| `Cmd+Option+C` when a field is selected | Copy the entire document |
| `Cmd+Shift+V` | Read Clipboard in either view |
| `Cmd+E` | Edit Input / resume draft |
| `Cmd+N` | New Input |
| `Cmd+Shift+Backspace` in the form | Clear Input and saved draft |
| `Cmd+K` | Open Actions |
| `Escape` | Dismiss the action menu, clear active search, or return to the previous level |

Less frequent format and view shortcuts are available inside **Copy As…** and **View Options** after opening those submenus. Type filtering is also available from the top-right dropdown.

## Development

Requires Raycast 2.2 or later and Node.js 22.22.2 or later.

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Rebuild the locally installed extension without a watcher
npm run build

# Run parsing, navigation, draft-priority, and search regression tests
npm test

# Lint code (optional, explicit command)
npm run lint
```

### After upgrading to Raycast v2

Local development extensions are not updated from the Store. If Better JSON reports incompatibility or `Missing executable. You might need to build the extension.`, open Raycast v2 and rebuild from this project:

```bash
npm ci
npm run dev
```

After the build succeeds, open Better JSON in Raycast. You can stop the development watcher with `Ctrl+C`; the built extension remains installed. Use `npm run build` to rebuild it later without starting a watcher.

See the [Raycast extension manual](https://manual.raycast.com/extensions) for local extension development and updates.

## Publishing

```bash
npm run build
npm run lint
npm run publish
```

## License

MIT

## Author

XiaoDaiGua-Ray
