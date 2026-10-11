# SnapState for Raycast

Restore complete Mac workspaces from Raycast.

This is a companion to the native SnapState app. The extension only reads a small local index containing workspace names and counts, then asks SnapState to perform the native capture or restore. Window positions, titles, browser URLs, and full workspace snapshots stay inside SnapState.

## Commands

- **Restore Workspace** — search saved SnapState workspaces and restore one.
- **Save Current Workspace** — name and capture the current Mac workspace.

SnapState must be installed and activated for capture and restore. The extension does not duplicate the Accessibility or Apple Events functionality of the native app.

## Development

```bash
npm install
npm run dev
```

Validate the distribution build with:

```bash
npm run build
npm run lint
```

## Privacy

The extension reads only `~/Library/Application Support/SnapState/raycast-workspaces.json`. The native app owns the full workspace data and restoration process.

## License

MIT
