# VS Code Open Recent (Raycast v1)

A minimal Raycast extension with a single command, **Open Recent Project**.
It reads VS Code's recent list from `state.vscdb` and opens local and remote
(`vscode-remote://`) entries. Based on raycast/extensions
`visual-studio-code-recent-projects` at commit `081f60f7a` (last v1-compatible).

## Install (Raycast v1)

```bash
npm install
npm run dev   # imports the extension into Raycast; Ctrl+C afterwards, it stays installed
```

## Usage

- Enter: open (remote: reuse window)
- Cmd+N: open in a new window
- Cmd+F: reveal in Finder (local only)
- Cmd+Shift+C: copy path / URI

Choose the editor (Code, Insiders, Cursor, VSCodium, Windsurf) in the extension preferences.
