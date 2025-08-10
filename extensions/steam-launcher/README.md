# Raycast Steam Launcher (Windows)
Launch and manage Steam on Windows from Raycast. The extension discovers your Steam install and libraries, lists installed games for the currently logged-in account, and provides account switching helpers.

## Features
- List/search installed Steam games (current account only)
- Launch via steam://rungameid/<appid> with fallback to steam.exe -applaunch <appid>
- Accounts:
  - Primary: Switch (Prefill Username) — starts Steam with -login <account> to prefill username (best-effort)
  - Secondary: Switch (Logout and Restart) — logs out and restarts Steam for manual sign-in
  - Open Steam, open Game Files (opens each library's steamapps/common)
- Autodiscovers Steam path (registry) and all libraries (libraryfolders.vdf)

## Requirements
- Windows with Steam installed
- Raycast for Windows
- Node.js (for local development)

## Install & Run (local)
```bash
npm install
npm ci
npm run dev
```

Then in Raycast:
- Steam — unified command with three sections:
  - Games (listed first): browse/search/launch installed games (filtered to current account)
  - Shows library drive tag for each title (no App IDs in the list)
  - Accounts: switch (prefill) or logout+restart; copy account and SteamID64; set a nickname
  - Steam Actions: open Steam, open Game Files, restart Steam

## How it works
- Steam path from registry: HKCU\Software\Valve\Steam (fallbacks to HKLM).
- Libraries from <Steam>\steamapps\libraryfolders.vdf.
- Games from steamapps\appmanifest_*.acf.
- Current user inferred from loginusers.vdf; games are filtered where manifest LastOwner matches the current SteamID64.

## Account switching details
- Prefill (primary): steam.exe -login <account> attempts to prefill the username. This flag is not officially documented and may be ignored by some client versions.
- Logout + Restart (secondary): Logs out via protocol and restarts Steam; sign in manually.
- No credentials are stored; the extension does not modify AutoLoginUser.

## Limitations
- Manifests without LastOwner may be omitted from the games list.
- -login behavior can vary by Steam client version.
- Only installed titles (with manifests) are shown.

## Dev notes
- Command: src/steam-games.tsx (unified)
- (Legacy files kept for reference): src/steam-accounts.tsx, src/steam-actions.tsx
- Utils: src/utils/steam.ts (registry/VDF discovery, parsing, launch), src/utils/vdf.ts (minimal VDF)
 - Icon asset: package.json now references `command-icon.png` (filename only; file lives under `assets/`), replacing the emoji to satisfy Raycast validation
 - Linting: replaced `any` in catches with `unknown` and added no-op comments to empty catch blocks; updated `debounce` generics to avoid explicit `any`

### Game actions
- Launch game
- Open Game Folder (uses Windows `start`)
- Copy App ID

### Account actions
- Switch (Prefill Username)
- Switch (Logout and Restart)
- Open Steam
- Open Game Files
- Copy Account Name / SteamID64
- Set Nickname (for easier search) / Clear Nickname
  - Nickname changes reflect instantly after saving/clearing and selection stays on the edited account

#### Account search
- You can search accounts by: persona name, account name, SteamID64, or nickname.
- Nicknames are stored locally via Raycast LocalStorage and shown as an orange tag in the list.

## License
MIT
