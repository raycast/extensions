# X Post Screenshot

A Raycast extension that turns the X (Twitter) post in your active browser tab into a clean screenshot image on the clipboard.

1. Open a post, for example `https://x.com/<user>/status/<id>`, in a browser with the Raycast browser extension.
2. Run **Screenshot X Post** in Raycast.
3. Paste the image anywhere.

The card shows the author, text, media, time, views and counts, plus a quoted post and the earlier posts of a thread. It uses a dark, dim or light theme, and the backdrop gradient takes its colors from the post's avatar and media.

Each screenshot is also saved as `hw_raycast_xscreenshot_<YYYY-MM-DD_HH-MM-SS>_<handle>_<id>.png` in `~/Pictures/hw_raycast_xscreenshot`. Run **Open X Screenshot Folder** to browse them, or search for `hw_raycast_xscreenshot` with Raycast's Search Files.

## Setup

Install the [Raycast browser extension](https://www.raycast.com/browser-extension) for your browser. The extension reads the open tab through it. No account or API key is needed.

## Preferences

- **Theme:** dark, dim or light card.
- **After Capture:** close the launcher when done, or stay open with a Show in Finder action.
- **Save Folder:** where the PNG files go (default `~/Pictures/hw_raycast_xscreenshot`).

## How it works

The post HTML is read from the page and parsed locally. Only the avatar and media images are downloaded, from X's image server (`pbs.twimg.com`). The card is drawn with the macOS built-in `osascript`, so nothing else is installed or compiled.

## Known limits

- macOS only.
- Only the first four media items of a post are shown, and at most four earlier posts of a thread.
- X changes its page markup often. If a post renders wrong, open an issue with the post URL.

## Development

```sh
npm install
npm run dev
```

## License

MIT
