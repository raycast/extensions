# Repository Workflows

## Commands
- `npm run dev`: Start Raycast development mode via `ray develop`.
- `npm run build`: Build the extension into `dist` via `ray build -e dist`.
- `npm run lint`: Run Raycast linting via `ray lint`.
- `npm run fix-lint`: Apply lint fixes via `ray lint --fix`.

## Runtime workflow
- This is a Raycast extension for browsing Plex music libraries and controlling a Plexamp player over HTTP.
- The command entrypoints are defined in `package.json`; `browse-media` and `player-controls` live in `src/browse-media.tsx` and `src/player-controls.tsx`, while the search commands are thin wrappers around shared implementations in `src/search-shared.tsx`.
- Shared Plex server and Plexamp requests live in `src/plex.ts`; XML responses are parsed with `fast-xml-parser`.
- Library selection is centralized in `src/use-library-selection.ts`: it loads music sections from Plex and resolves the configured `Music Library` preference, auto-selecting when only one music library exists.
- `browse-media` lists artists from the selected music library and audio playlists from Plex, with drill-down views for albums, album tracks, and playlist tracks.
- Browse and search commands share playback actions from `src/shared-ui.tsx` and can play immediately, add to queue, or insert an item as play next in Plexamp.
- `player-controls` reads Plexamp timeline and play queue state, then exposes transport controls plus queue refresh and jump-to-track actions.
