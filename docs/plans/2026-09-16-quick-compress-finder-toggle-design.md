# Quick Compress Finder Toggle Design

## Goal

Let people choose whether Quick Compress reveals the resulting archive in Finder.

## Design

Add a checkbox to the existing `quick-compress` command preferences in `extensions/archiver/package.json` named `revealInFinder`. It will be labeled “Reveal Compressed File in Finder” and default to `true`, preserving the extension's original behavior.

Extend `ICompressPreferences` with the same boolean. `quick-compress.tsx` will retain the compression result path and call `showInFinder(path)` only when `preferences.revealInFinder` is enabled. The success HUD and all other compression behavior remain unchanged.

## Validation

Use the extension's lint and build commands. Manually exercise Quick Compress with the preference both enabled and disabled in Raycast.
