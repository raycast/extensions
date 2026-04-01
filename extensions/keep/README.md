# Keep

Keep lets you search saved links, save new ones, save the active browser tab, save from the clipboard, mark links read or unread, delete links, and track unread count in the menu bar.

## Setup

1. Create a personal API key in Keep at `Settings → API`.
2. In Raycast, open the extension preferences and paste your API key.
3. Leave `Base URL` empty for `https://keep.md`, or set it if you use a custom Keep install.

## Commands

- `Search Links`: browse and manage your Keep library
- `Save Link`: save a URL directly from Raycast
- `Save Link from Clipboard`: save the current clipboard URL
- `Save Current Tab`: save the active tab with the Raycast Browser Extension
- `Unread Links`: show unread items in the menu bar

## Local Development

```sh
pnpm dev
```

## Build

```sh
pnpm build
```

## Prepare for Submission

```sh
pnpm run submit:prepare
```
