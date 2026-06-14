# Raycast Lark Search

Search Feishu/Lark docs, messages, chats, and contacts from Raycast.

## Features

- Search documents, messages, contacts, and chats from one Raycast command.
- Append scope filters such as `/doc`, `/msg`, and `/im` in the search box.
- Open chat and message results directly in the desktop app.
- Open document results in the browser.
- Maintain a local Script Commands hot index for Raycast Root Search.
- Cache recent search results locally for faster repeated searches.

## Requirements

- macOS with Raycast installed.
- `lark-cli` version `1.0.53` or later.
- A configured `lark-cli` user login.
- Lark and/or Feishu installed if you want chat, contact, and message results to open directly in the desktop app.

Default application settings:

| App    | App Picker Name | Bundle ID               | lark-cli Identity |
| ------ | --------------- | ----------------------- | ----------------- |
| Lark   | `Lark`          | `com.larksuite.larkApp` | `user`            |
| Feishu | `Feishu`        | `com.electron.lark`     | `user`            |

You can enable both desktop apps. If they use different `lark-cli --as` identities, set the identity for each app in extension preferences.

Minimum scopes for the main search command:

```bash
lark-cli auth check --scope "search:docs:read search:message im:chat:read contact:user.base:readonly"
```

Optional scopes for pinned chats and flagged messages in the hot index:

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

## Hot Index Setup

Run `Setup Lark Hot Index` from Raycast, then add the generated folder to:

```text
Raycast Settings > Extensions > Script Commands > Add Directories
```

The default folder is:

```text
~/Documents/Raycast Script Commands/Lark Hot Index
```

## Privacy

This extension does not store Lark credentials. Authentication and API access are handled by `lark-cli`. Local caches contain recently opened search result metadata on your machine only.

## License

MIT
