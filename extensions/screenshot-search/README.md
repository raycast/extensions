# Screenshot Search

Raycast commands for searching, previewing, reusing, and pasting screenshots and screen recordings.

## Commands

- **Search Screenshots** — grid search with `name:`, `text:`, and natural-language `date:` filters. Use Quick Look, copy/paste, pin, or open a file from the Action Panel.
- **Paste Latest Screenshot** — pastes the newest indexed image into the previously active app.

## Setup

1. Run `npm install`.
2. Run `npm run dev` to load the extension in Raycast.
3. Configure **Search Scopes** in the extension preferences. The system screenshot folder, CleanShot X folder, Desktop, and the supplied Dropbox `screen_shot` folder are included when they exist.
4. Use **Add Search Scope** from the Action Panel to choose another folder.

OCR uses macOS Spotlight metadata in Fast mode and Vision in Accurate mode. Storage Duration limits the local index/cache; original files are never deleted.

## Publish

Log in with `npx ray login`, set a registered Raycast username in `package.json` as `author`, then run `npm run publish`.
