# Memos for Raycast

<img src="./assets/usememos.png" alt="" width="64" align="right">

The official [Memos](https://usememos.com) extension for [Raycast](https://www.raycast.com/). Capture, find and manage your memos without leaving Raycast. It works with any Memos instance, self-hosted or the public demo. Find the Memos project on [GitHub](https://github.com/usememos/memos).

## Status

This release covers connection setup plus capture, search and open flows. See the [changelog](CHANGELOG.md).

## Commands

| Command                     | Description                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| **Setup Memos**             | Connects Raycast to your instance and checks your access token.          |
| **Search Memos**            | Searches memos and previews them rendered as Markdown.                   |
| **Create Memo**             | Writes a memo in Markdown, previews it, and saves it to Memos.           |
| **Capture Memo**            | Saves text typed in Root Search as a new memo.                           |
| **Save Clipboard as Memo**  | Saves the text on your clipboard as a new memo.                          |
| **Open Memos**              | Opens your Memos instance in the default browser.                        |

## Requirements

- Raycast on macOS or Windows
- A Memos instance running a recent release (tested against v0.30)

## Getting started

1. Install Memos from the Raycast Store. The store link will be added after publishing.
2. Run **Setup Memos**. Raycast asks for two settings.
3. For **Instance URL**, enter your instance's address or keep `https://demo.usememos.com` to try it out.
4. For **Access token**, open **Settings → Access Tokens** in Memos, create a token and paste it into Raycast. Use [the demo settings](https://demo.usememos.com/setting#access-token) or `https://<instance>/setting#access-token` for your own instance.
5. The command confirms **Connected as …** with Accepted (and Demo, when using the public instance). If it does not, it explains what to fix.

## Changing settings later

Open Raycast Settings → Extensions → Memos, or choose **Open Extension Preferences** by pressing ↵ in Setup Memos. Run Setup Memos again to re-test the connection.

## Troubleshooting

| Message                                         | Cause                                     | Fix                                                                                               |
| ----------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `<instance> rejected the access token`          | The token is missing, expired or invalid. | Create a new token at `https://<instance>/setting#access-token`, update the preference and retry. |
| `Couldn't reach <instance>`                     | The server or network cannot be reached.  | Check the instance URL, your network connection and whether the Memos server is running.          |
| `<instance> doesn't look like a Memos instance` | The address does not point to Memos.      | Check the instance URL in the extension preferences.                                              |
| `"<address>" is not a valid instance URL`       | The address is not a valid HTTP(S) URL.   | Enter a full address such as `https://memos.example.com`.                                         |

## Privacy

Your access token is stored in Raycast's encrypted preferences. Requests go only to the configured Memos instance, and the extension has no telemetry.

> The demo instance is public and reset regularly. Do not put private notes there.

## Development

```sh
git clone https://github.com/usememos/raycast-extension
cd raycast-extension
pnpm install
pnpm dev
```

| Script           | Purpose                                   |
| ---------------- | ----------------------------------------- |
| `pnpm dev`       | Run the extension in development mode.    |
| `pnpm lint`      | Check Raycast Store and code style rules. |
| `pnpm fix-lint`  | Fix automatically repairable lint issues. |
| `pnpm build`     | Build the extension.                      |
| `pnpm typecheck` | Run the TypeScript type checker.          |
| `pnpm test`      | Run the unit tests.                       |

See [Architecture](docs/architecture.md) and [Philosophy](docs/philosophy.md) for the project's structure and principles. AI agents follow [AGENTS.md](AGENTS.md).

Issues and pull requests are welcome in the [GitHub repository](https://github.com/usememos/raycast-extension).
