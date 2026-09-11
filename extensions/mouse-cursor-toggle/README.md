# Mouse Cursor Toggle for Raycast

A macOS-only Raycast extension that hides or shows the mouse cursor with one command.

![Mouse Cursor Toggle icon](assets/cursor.png)

## Run it locally

1. Install [Raycast](https://www.raycast.com/) and Xcode 16.3 or newer.
2. Run `npm install` in this folder.
3. Run `npm run dev`.
4. Search Raycast for **Toggle Mouse Cursor**.

If you have not used Raycast's developer tools before, run `npx ray login` first. You
can then use `npx ray profile` to see the handle expected by the manifest.

Assign a hotkey in **Raycast Settings → Extensions → Mouse Cursor Toggle** for instant access.

## How it works

Raycast unloads no-view commands after they finish, while macOS requires the process hiding the cursor to remain alive. The command imports a Swift module built by Raycast, which starts a tiny detached worker when hiding the cursor and stops it when showing the cursor again.

Global background cursor hiding is not exposed through a public macOS API. The helper uses the undocumented WindowServer `SetsCursorInBackground` connection property before calling Core Graphics. This can change between macOS releases and may affect eligibility for the Raycast Store.

The helper only uses Apple's Core Graphics API. It does not monitor mouse movement, keyboard input, or accessibility events.

## Development

- `npm run build` builds the Swift module and extension through Raycast's standard toolchain.
- `npm run lint` checks the extension.

The reviewed Swift source lives in `swift/cursor-helper/` and is imported directly from TypeScript with Raycast's native module support. No precompiled helper binary is committed to the extension.

If the helper is stopped externally, macOS normally restores the cursor automatically. Running the command again also discards any stale helper state. The Raycast command talks to the helper through a private, token-authenticated control pipe, so it does not need process-list access.

## License

MIT. The icon includes a glyph adapted from Lucide Icons under the ISC license; see `THIRD_PARTY_NOTICES.md`.
