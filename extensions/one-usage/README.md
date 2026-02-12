# One Usage

A [Raycast](https://raycast.com) extension that tracks **Claude**, **Codex**, and **Cursor** usage in one place. View usage in a list or from the menu bar, with quick links to each provider’s dashboard and status page.

**Extension preferences** (Raycast → Extensions → One Usage → Preferences): enable or disable **Claude**, **Codex**, and **Cursor**. At least one provider must be enabled; if all are disabled, View Usage shows “No Providers Enabled”.

## Supported Providers

| Provider   | Data source / auth                         | What’s shown                                        |
| ---------- | ------------------------------------------ | --------------------------------------------------- |
| **Claude** | macOS Keychain (`Claude Code-credentials`) | Plan, usage %, reset time, optional extra usage     |
| **Codex**  | `~/.codex/auth.json`                       | Plan, rate limit usage %, reset time                |
| **Cursor** | Cursor app state DB + Cursor API           | Plan, usage %, included/on-demand spend, reset time |

If a provider isn’t signed in or data can’t be read, that provider shows an error in the list/menu bar (e.g. “Cursor not found. Open Cursor and sign in.”).

## Development

```bash
npm install
npm run build   # build extension
npm run dev     # development mode
npm run lint    # lint
npm run fix-lint # fix lint
```

## License

MIT
