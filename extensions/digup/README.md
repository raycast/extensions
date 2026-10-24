# DigUp for Raycast

Search your files by what's in them, from Raycast. This extension is a front end for [DigUp](https://github.com/ARahim3/DigUp), the on-device semantic file search app for macOS. DigUp indexes the text, images, PDFs, screenshots, audio and video in the folders you choose; this extension searches that index without leaving Raycast.

## Features

- **Instant results.** It keeps DigUp's searcher running while the window is open: results that contain your words appear on every keystroke, and results that match the meaning arrive as soon as you pause, each in about a tenth of a second.
- **Previews.** The side panel shows the matching PDF page, the picture, the video frame at the matching moment, or the passage that matched with your words in bold.
- **Full-size preview.** Press **→** on a result to open it large, **←** to go back. In a PDF, **⌘↓ / ⌘↑** turn pages.
- **File type filter** in the search bar: documents, PDFs, images and screenshots, videos, audio.
- **Best and weaker matches** are kept apart, as in DigUp's own panel.

## Shortcuts

| Key | Action |
| --- | --- |
| ↩ | Copy path |
| ⌘↩ | Open |
| → / ← | Full-size preview / back to results |
| ⇧⌘↩ | Show in Finder |
| ⌘Y | Quick Look |
| ⌥↩ | Paste path into the app you came from |
| ⇧⌘C | Copy the file |
| ⌥⌘C | Copy the file name |
| ⇧⌘. | Copy the folder path |
| ⌘O | Open with… |
| ⌘P | Hide or show the side preview |

## Requirements

- [DigUp](https://github.com/ARahim3/DigUp) installed in `/Applications` and set up, with at least one folder indexed. The extension uses the `digup` helper inside the app (`DigUp.app/Contents/Helpers/digup`); if DigUp lives elsewhere, set the path in the extension's preferences.
- The extension searches the same folders and honors the same exclusions you chose in DigUp.

## Tip

To open the search with DigUp's own shortcut instead of DigUp's panel, turn off the shortcut in DigUp's settings and assign it to **Search Files with DigUp** in Raycast (Settings → Extensions).

## Development

```bash
npm install
npm run dev
```

## License

MIT
