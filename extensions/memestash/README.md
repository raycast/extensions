# MemeStash

A [Raycast](https://raycast.com) extension for your own curated library of images and memes — like Raycast's "Search Emoji & Symbols", but for pictures. Search by keyword, pick one, and it pastes straight into the app you were just in.

## Commands

- **Search Memes** — a grid of your images, fuzzy-filtered across each image's name and keywords. The primary action pastes the picked image into the frontmost app; a secondary action copies it to the clipboard for a manual ⌘V.
- **Add to MemeStash** — add an image from a file picker, the clipboard, or your current Finder selection, with a name and comma-separated keywords.

## How it works

Your library is a single folder containing your image files plus one `index.json` manifest that is the source of truth. By default this lives at `~/Pictures/MemeStash`; change it via the extension's **Library Folder** preference.

Each image is identified by a content hash (sha256 of the file), so re-adding the same picture updates it in place instead of creating a duplicate, even if the filename differs. The manifest records each image's name, keywords, dimensions, size, and last-updated time. Because the folder is self-contained and references images by relative name, you can keep it in iCloud Drive or another synced location.

### A note on pasting

Pasting inserts the image **inline** in apps that support inline images (e.g. Messages, Notes). **Slack** has no concept of an inline image inside a message, so the image is added as an upload/attachment instead — that's expected. Pasting the file (rather than raw image data) also keeps animated GIFs animated.

## Development

This extension uses **npm** (not pnpm or yarn).

```sh
npm install
npm run dev                 # develop with live reload in Raycast
npx ray build -e dist       # build / typecheck
npx ray lint                # lint (add --fix to autofix)
```

Requires macOS (uses the built-in `sips` tool to read image dimensions).
