# DevTools Launcher

Search the tools in the [DevTools](https://github.com/me-shaon/devtools) desktop app and open one from Raycast.

## Requirements

- DevTools 2.1 or later, installed on this Mac. DevTools 2.1 adds the `devtoolsapp://` links that this extension uses.

## Where the tool list comes from

DevTools 2.1 and later write their tool list to `~/Library/Application Support/com.meshaon.devtoolsapp/tools.json` each time they start.

The extension reads that file. New tools in a DevTools update therefore appear in Raycast without an extension update, and the list always matches the installed version. When the file is missing, the extension uses a bundled list.

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
