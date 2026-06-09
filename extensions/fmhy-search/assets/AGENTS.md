# AGENTS.md

## Scope

This folder contains static assets packaged with the Raycast extension.

## Guidance

Keep the extension icon as a PNG suitable for Raycast packaging. Raycast requires `assets/icon.png` to be exactly `512 x 512` pixels; resize/crop before running `npm run check` if the source artwork changes.

Related-link brand icons used by the command are remote Simple Icons URLs in `src/search-fmhy.tsx`, not files in this folder.

Do not add generated build output here; bundled JavaScript belongs in the ignored `dist/` directory.
