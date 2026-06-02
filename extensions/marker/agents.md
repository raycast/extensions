# Agent Notes

## Raycast/Recast Extension Refresh

- `npm run build` updates the compiled extension files under Raycast's extension output directory, but Raycast/Recast can keep a separate command registry/cache for Settings and root search.
- When command titles, command count, arguments, or visibility do not match the built `package.json`, run `npm run dev` once to force the local extension manifest to register. Let it finish the initial build, then stop the watcher.
- For Raycast X, verify the compiled manifest in the Raycast X extension output directory, typically under `~/.config/raycast-x/extensions/<extension-name>/package.json`.
- If the compiled manifest is correct but Settings still shows stale commands after `npm run dev`, fully quit and reopen Raycast X or remove/re-add the local Marker extension registration.
