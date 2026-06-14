# Raycast Lark Search

Search Feishu/Lark docs, messages, chats, and contacts from Raycast.

## Features

- Search documents, messages, contacts, and chats from one Raycast command.
- Append scope filters such as `/doc`, `/msg`, and `/im` in the search box.
- Open chat and message results directly in the desktop app.
- Open document results in the browser.
- Maintain local shortcuts for Raycast Root Search.
- Cache recent search results locally for faster repeated searches.

## Requirements

- macOS with Raycast installed.
- Lark-cli version `1.0.53` or later.
- A configured `lark-cli` user login.
- Lark and/or Feishu installed if you want chat, contact, and message results to open directly in the desktop app.

Application target options:

| Option            | Opens With                                   |
| ----------------- | -------------------------------------------- |
| `Lark`            | Lark desktop app                             |
| `Feishu`          | Feishu desktop app                           |
| `Feishu and Lark` | Both desktop apps as separate result sources |

Bundle IDs are built in: Lark uses `com.larksuite.larkApp`, and Feishu uses `com.electron.lark`. The default `lark-cli` identity is `user`; configure separate Lark and Feishu identities only when the two apps use different `lark-cli --as` accounts.

Minimum scopes for the main search command:

```bash
lark-cli auth check --scope "search:docs:read search:message im:chat:read contact:user.base:readonly"
```

Optional scopes for pinned chats and flagged messages in Root Search shortcuts:

```bash
lark-cli auth check --scope "im:feed.shortcut:read im:feed.flag:read"
```

## Development

```bash
npm install
npm run dev
```

Run checks before publishing changes:

```bash
npm run local-install
npm run lint
npm run build
```

`npm run publish` also runs `npm run local-install` first, so the local Raycast extension is refreshed before each Store submission.

## Root Search Setup

Run `Set up Lark Root Search` from Raycast, choose the `Root Search Shortcut Folder` preference if you want a custom location, then add that folder to:

```text
Raycast Settings > Extensions > Script Commands > Add Directories
```

The default Root Search shortcut folder is:

```text
~/Documents/Raycast Script Commands/Lark Hot Index
```

## Privacy

This extension does not store Lark credentials. Authentication and API access are handled by `lark-cli`. Local caches contain recently opened search result metadata on your machine only.

## License

MIT
