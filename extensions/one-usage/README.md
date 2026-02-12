# One Usage

A [Raycast](https://raycast.com) extension that tracks **Claude**, **Codex**, and **Cursor** usage in one place. View usage in a list or from the menu bar, with quick links to each provider’s dashboard and status page.

### View Usage

- **Detail view**: Plan name, usage progress (percent/dollars), reset time, last updated.
- **Actions**:
  - **Refresh** – Clear cache and refetch all providers.
  - **Usage Dashboard** / **Status Page** – Open the provider’s dashboard or status page.
  - **Order**: Move to Top, Move Up, Move Down to reorder providers in the list.
  - **Pin to Menu Bar** – Use this provider as the single one shown in the menu bar (or show “All”).
- **Selected** tag (blue) indicates the provider currently pinned to the menu bar.

### Menu Bar Usage

- Shows a compact title (e.g. usage percentages) and a dropdown with each provider’s metrics.
- **Refresh interval** (extension preference): 5m, 15m, or 30m for background refresh.
- Dropdown items: usage lines, last updated, and links to Usage Dashboard and Status Page per provider.

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
