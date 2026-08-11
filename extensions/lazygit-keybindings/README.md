# Lazygit Keybindings (Raycast Extension)

Search Lazygit keybindings by action or shortcut, with language selection. The extension fetches the official Lazygit docs at runtime, caches them locally, and lets you filter by the locale you prefer.

## Features
- Search Lazygit actions (e.g., “cherry pick”) or shortcuts (e.g., `cmd+c`).
- Locale dropdown preference (default `en`) with all upstream locales included.
- Local caching with configurable TTL; manual refresh action.
- Quick actions: copy shortcut, open upstream doc, force refresh.

## Preferences
- **Locale**: Select your preferred language (English default).
- **Use Cache**: Toggle on/off the local cache.
- **Cache TTL (minutes)**: How long cached data is kept before re-fetching (default 1440).

Supported locales: en, ja, ko, nl, pl, pt, ru, zh-CN, zh-TW.

## How to use
1. In Raycast, run “Lazygit Keybindings”.
2. Type an action (e.g., “cherry pick”) or a shortcut (e.g., `cmd+c`).
3. Use the action panel:
   - Copy Shortcut
   - Open Upstream Doc
   - Refresh (forces re-fetch, bypassing cache)
4. To change language or cache behavior, open command preferences (`⌘+,` inside Raycast while on the command) and adjust locale/TTL/cache toggle.

## Development
1. Install deps: `npm install`
2. Run in Raycast dev mode: `npm run dev`
3. Lint/validate: `npm run lint`
4. Build: `npm run build`

## Data Source
- Keybindings pulled from `https://raw.githubusercontent.com/jesseduffield/lazygit/master/docs/keybindings/Keybindings_<locale>.md`.
- Locale list and parsing rules documented in `RESEARCH.md`.

## Files of Interest
- `src/index.tsx`: Command UI and search.
- `src/keybindings.ts`: Fetch, parse, cache.
- `src/format.ts`: Shortcut formatting utilities.
- `src/constants.ts`: Locale list and URL builder.
- `PLAN.md`: Implementation plan and progress tracker.
- `RESEARCH.md`: Collected research on Lazygit docs and Raycast manifest.

## Publishing to Raycast Store
1. Ensure `ray lint` and `ray build` pass locally.
2. Commit your changes and push to a public fork/branch of `raycast/extensions` (see their contribution guide).
3. Place the extension under `extensions/lazygit-keybindings` (or similar) in that repo, keeping `package.json` manifest valid and icon at `assets/icon.png` (512x512).
4. Open a PR to `raycast/extensions` following their template; include screenshots/GIF and a short description.
5. Respond to Raycast review feedback if they request changes; once approved, they publish it to the Store.
