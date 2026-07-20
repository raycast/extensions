# Vaulted for Raycast

Zero-knowledge encrypted, self-destructing secret links from your launcher.

Encrypt a password, API key, or any short piece of text on your machine, get back a one-time link, and share it through any channel — Slack, email, SMS. The recipient opens the link, the secret decrypts in their browser, and it's gone forever. The Vaulted server only ever stores ciphertext; the decryption key lives in the URL fragment, which browsers never transmit.

## Commands

### Create Secret

Form-driven creation. Type or paste up to 1,000 characters, pick a max-view count (1, 3, 5, 10, or unlimited within expiry), pick an expiry (1 hour to 30 days), and optionally add a passphrase that the recipient must enter to decrypt. The share link is copied to your clipboard automatically.

### Create Secret from Clipboard

The hotkey path. Bind it to a Raycast shortcut (e.g. ⌥⌘V), copy a secret to the clipboard, fire the command. The clipboard is replaced with a Vaulted share link, your defaults from preferences are used. A HUD confirms the result.

### View Secret

Paste a Vaulted link, optionally enter the passphrase if the link was passphrase-protected, and the plaintext appears in a Detail view. A confirmation prompt warns you before consuming a view (toggleable in preferences).

## Privacy & security

- **Zero-knowledge.** All encryption and decryption happen in this extension's local Node sandbox using AES-256-GCM via the [`@vaulted/crypto`](https://www.npmjs.com/package/@vaulted/crypto) package — the same primitives as [vaulted.fyi](https://vaulted.fyi), the CLI, the MCP server, and the official GitHub Action.
- **No telemetry, no analytics, no third-party scripts.** The extension's only network egress is to the host you configure (default: `https://vaulted.fyi`).
- **Nothing persisted on disk.** This version writes nothing to LocalStorage. No history, no plaintext, no keys.
- **HTTPS-only**, with `http://localhost` and `http://127.0.0.1` allowed for self-hosted development.
- **Identifies itself** to the server with `User-Agent: vaulted-raycast/<version>` and surfaces any server-supplied error message verbatim, so deprecation notices and rate-limit details reach you.

## Preferences

- **Vaulted host** — Base URL of the Vaulted instance. Default `https://vaulted.fyi`. Point at your own deployment for self-hosted use.
- **Default max views** — How many times the link can be viewed before destruction. Default 1.
- **Default expiry** — How long the link survives if unused. Default 24 hours.
- **Open in browser** — Open the link in your browser after creation. Default off.
- **Confirm before consuming a view** — Show a confirmation before revealing a secret in the View command. Default on.

## How Vaulted compares

Vaulted is open source and end-to-end encrypted. The server never sees plaintext or the decryption key, even if it's compromised. Read more at [vaulted.fyi/security](https://vaulted.fyi/security) and [vaulted.fyi/how-it-works](https://vaulted.fyi/how-it-works).

## Source code

This extension: [github.com/vaulted-fyi/vaulted-raycast](https://github.com/vaulted-fyi/vaulted-raycast)

Related projects:

- [vaulted.fyi](https://vaulted.fyi) — the web app
- [`vaulted-cli`](https://www.npmjs.com/package/vaulted-cli) — terminal client
- [`@vaulted/mcp-server`](https://www.npmjs.com/package/@vaulted/mcp-server) — MCP integration for AI agents
- [`share-secret`](https://github.com/vaulted-fyi/share-secret) — GitHub Action

## Author

Maxim Novak ([@maxim_novak](https://www.raycast.com/maxim_novak))

## License

MIT
