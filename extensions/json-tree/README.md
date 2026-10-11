# JSON Tree for Raycast

View JSON from the clipboard as a searchable, collapsible tree.

## Features

- Reads and parses clipboard JSON automatically.
- Expands and collapses objects and arrays.
- Searches keys, primitive values, serialized container values, and JSONPath.
- Copies a primitive value, a formatted subtree, compact JSON, or JSONPath.
- Handles keys that need bracket notation, for example `$["first-name"]`.

## Install locally

Requirements: Raycast, Node.js 22.14 or newer, and npm 7 or newer.

1. Extract this folder and open Terminal in it.
2. Run `npm install`.
3. Run `npm run dev` once. Raycast will register the local extension and open the command.
4. Copy valid JSON, open Raycast, and run **JSON Tree**.

Alternatively, use Raycast's **Import Extension** command and select this folder, then install dependencies and start development when prompted.

## Publish to the Raycast Store

Requirements: a Raycast account whose handle matches the `author` field in `package.json`, and a GitHub account.

1. Install the dependencies with `npm install`.
2. Test the extension locally with `npm run dev`.
3. Validate the production build with `npm run build`.
4. Run `npm run lint` and fix any reported issues.
5. Run `npm run publish` and complete the GitHub authorization when prompted.

The publish command submits the extension to the public [`raycast/extensions`](https://github.com/raycast/extensions) repository as a pull request. After the pull request passes review and is merged, the extension is published automatically in the Raycast Store.

The `author` field is currently set to `enjisene`. Change it before publishing if your Raycast account uses a different handle.

## Keyboard

- `↑` / `↓`: move through visible nodes (native Raycast list navigation)
- `Enter`: expand/collapse a container; copy a primitive value
- Type in the search bar: filter by key, value, or JSONPath
- `⌘ C`: copy a selected container as formatted JSON (primitive values use `Enter`)
- `⌘ ⇧ C`: copy compact container JSON, or JSON representation of a primitive
- `⌘ ⇧ J`: copy JSONPath
- `⌘ E`: expand/collapse the selected container
- `⌘ ⇧ E`: collapse all
- `⌘ R`: reload JSON from the clipboard

Press `⌘ K` to see every action available for the selected node.
