# Lantern for Raycast

"Search Lantern" in Raycast: Lantern's results (code definitions, files at the line, page or moment, photos) in
Raycast's window. The Lantern app must be running; its daemon answers over its local Unix socket, and nothing leaves
the Mac (Raycast's own features follow Raycast's privacy policy).

| Key | Action |
|---|---|
| ↩ | open at the line (VS Code, VSCodium, Cursor, Xcode, JetBrains), play from the moment (QuickTime), a PDF at its page (Skim; Preview through its Go to Page shortcut, which needs the Accessibility permission for Raycast), play a song |
| ⌥↩ | open from the start (a recording from 0:00) |
| ⌘↩ | show in Finder (a song: in Music or Spotify) |
| ⌘Y | preview, as in the Lantern panel: 30 lines around the code or the whole passage with your words in bold, inside Raycast; a photo in Quick Look (the whole photo); a video or recording in the Lantern app's own player, started at the moment of the match and scrubbable back to the start (Lantern 0.2.1 or newer); ⌘Y again closes it |
| ⇧⌘Y | text and code: Quick Look of the whole file; a video or recording: its frame and transcript at the moment, inside Raycast |
| ⌃1 … ⌃0 | filter by kind, the panel's digits (Raycast keeps ⌘1 … ⌘9 for opening the Nth result): Applications, System Settings, Shortcuts, (4, the clipboard: only in the app), Code, Documents, PDFs, Photos, Recordings and Videos, Music; again for all kinds |
| ⌘C | copy the file (paste it in Finder or attach it); an app likewise, a setting, shortcut or song as its name |
| ⌥⌘C | copy the matched text: the passage, the code around a definition, the text read from a photo, the transcript at the moment |
| ⇧⌘C | copy the path |

The preview on the right shows the lines around a code result (its lines marked ▶) or the passage with your words in
bold, under a thumbnail for photos and videos.

Preference: *Also show apps and System Settings* (off: Raycast finds those itself; ⌃1 / ⌃2 show them anyway).

## Prerequisites

Lantern for Raycast connects to the local [Lantern](https://github.com/misterekkk/lantern) macOS application over a Unix domain socket. Make sure the Lantern app is installed and running on your Mac.

The extension does not install Lantern. Without it, "Search Lantern" shows where to download it (or the Homebrew command `brew install --cask misterekkk/tap/lantern`); while Lantern is setting up, downloading its models or indexing for the first time, it says so instead of showing no results.

## Installation

- **Raycast Store:** Install the **Lantern** extension directly from the Raycast Store.
- **Development / Contributing:** To test or develop locally using the Raycast extensions repository:
  ```bash
  cd integrations/raycast        # in the raycast/extensions repository: extensions/lantern
  npm install
  npm run dev
  ```

Then in Lantern: Settings → General → Search from: **Raycast** (turns Lantern's own shortcut off), and in Raycast's
settings (sidebar → Lantern) give "Search Lantern" a hotkey or an alias such as `l`. Raycast itself opens on ⌥Space by
default: to give that to Lantern, move Raycast's own hotkey first (sidebar → Raycast → Raycast Hotkey).

To have Lantern under every Raycast query instead of a separate hotkey: Raycast's settings → Fallback Commands → add
"Search Lantern". ↩ on it opens Lantern's results for the text you typed.

The extension never reads your files itself, so Raycast needs no access to your folders: text comes from Lantern, and
photo and video thumbnails are made by Lantern into `~/Library/Caches/Lantern/thumbnails` (deleted after 10 minutes).
Only Quick Look (⌘Y) opens the file. The dropdown beside the search field filters by kind, like the panel's filters.

`npm run build` type-checks and bundles into `dist/`.
