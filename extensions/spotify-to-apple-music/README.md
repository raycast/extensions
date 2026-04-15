# Spotify to Apple Music

Open the song currently playing in Spotify in Apple Music.

## Requirements

- macOS
- Spotify
- Music

## Run it locally

1. Install dependencies with `npm install`.
2. Start Raycast development with `npm run dev`.
3. Run `Spotify to Apple Music` from Raycast.

## Checks

- Run `npm run build` to validate the distribution build.
- Run `npm run lint` to validate the manifest, icons, ESLint, and formatting checks.
- Run `npm test` to execute the unit tests for the Apple Music matching logic.

## Notes

- The command copies the current Spotify track URI to your clipboard before opening the best Apple Music match.
- The first run may trigger macOS automation prompts for Spotify and Music.
- If the extension cannot confidently match the exact song, it falls back to opening the Apple Music search page for the current track.
