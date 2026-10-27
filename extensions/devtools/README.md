# DevTools for Raycast

Search the tools in the [DevTools](https://github.com/me-shaon/devtools) desktop app and open one from Raycast.

## Requirements

- DevTools 2.1 or later, installed on this Mac. DevTools 2.1 adds the `devtoolsapp://` links that this extension uses.

## Where the tool list comes from

DevTools 2.1 and later write their tool list to the app data folder each time they start:

- macOS: `~/Library/Application Support/com.meshaon.devtoolsapp/tools.json`
- Windows: `%APPDATA%\com.meshaon.devtoolsapp\tools.json`

The extension reads that file. New tools in a DevTools update therefore appear in Raycast without an extension update, and the list always matches the installed version. When the file is missing, the extension uses the list bundled in `src/tools.json`.

## Commands

- **One command per tool.** Type a tool's name in Raycast's root search, for example `json`, `sha`, or `token`, and press Enter to open it in DevTools. Each command shows "DevTools" as its subtitle.
- **Search Tools** lists every DevTools tool. It also works as a Raycast fallback command: add it in Raycast Settings, then type any text in the root search and choose Search Tools to search with it. Type a name, a category, or a keyword such as `sha`, `yml`, or `diff`. Press Enter to open the tool.
  - Press ⌘⇧C to copy a link to the tool.
  - Press ⌘F to open the DevTools command palette with the tool name.
- **Open DevTools** opens the app. Type a search to open the DevTools command palette with that text.

## Links

The extension opens these links. You can also use them from a terminal, Alfred, Shortcuts, or a browser.

| Link | Result |
|---|---|
| `devtoolsapp://open/<tool-id>` | Opens a tool, for example `devtoolsapp://open/json-viewer`. |
| `devtoolsapp://search?q=<text>` | Opens the command palette with the text. |
| `devtoolsapp://home` | Shows the DevTools home page. |

## Development

1. Run `npm install`.
2. Run `npm run dev` to load the extension in Raycast.
3. Run `npm run sync-tools -- ../devtools` when tools change in the app. It copies the tool list and search keywords from the app's tool registry into `src/tools.json`, and regenerates the per-tool commands in `package.json` and `src/tool-*.ts`.

## Publishing

1. Set `author` in `package.json` to your Raycast username.
2. Run `npm run lint` and `npm run build`.
3. Run `npm run publish`. This opens a pull request to the `raycast/extensions` repository for review.
