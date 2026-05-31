# MacShotter

MacShotter is a small [Raycast](https://www.raycast.com/) extension for controlling
[macshot](https://github.com/sw33tLie/macshot) from one focused command menu.

Instead of adding every screenshot and recording action as a separate Raycast command,
this extension exposes a single `MacShotter` command. Open it in Raycast to browse
capture, recording, OCR, history and settings actions from a grouped list.

Requires macshot installed with URL scheme support.

Created by Muhammad Shafeeq.

## Commands

- Capture Area: `capture`
- Capture Fullscreen: `capture-fullscreen`
- Quick Capture: `quick-capture`
- OCR Text Extraction: `ocr`
- Record Area: `record`
- Record Fullscreen: `record-fullscreen`
- Scroll Capture: `scroll-capture`
- Stop Recording: `stop-recording`
- Show History: `history`
- Open Settings: `settings`
- Open Image in Editor: `open?file=...`

## Development

```sh
npm install
npm run dev
```

## Credits

- [macshot](https://github.com/sw33tLie/macshot): the macOS screenshot, recording
  and OCR app this extension controls through its `macshot://` URL scheme.
- [Raycast](https://www.raycast.com/): the launcher platform this extension is built
  for.
