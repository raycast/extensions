<p align="center">
  <img src="media/icon.png" width="128" height="128" alt="Simple GIF Cap icon" />
</p>

<h1 align="center">Simple GIF Cap</h1>

<p align="center">
  <b>Hotkey. Drag. Paste.</b><br />
  Record any part of your screen straight to a GIF on your clipboard, from Raycast.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Raycast-extension-FF6363?logo=raycast&logoColor=white" alt="Raycast extension" />
  <img src="https://img.shields.io/badge/macOS-only-000000?logo=apple&logoColor=white" alt="macOS" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Swift-F05138?logo=swift&logoColor=white" alt="Swift" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license" />
</p>

<p align="center">
  <img src="media/demo.gif" width="860" alt="Recording a region with Simple GIF Cap and getting the GIF in the preview" />
</p>

<p align="center"><sub>Yes, that is a GIF of a GIF.</sub></p>

## Why

You want to show a teammate what you are seeing: a bug, a flow, a glitch. A screenshot misses the motion, a screen recording is too heavy for chat, and [gifcap.dev](https://gifcap.dev) lives in a browser tab. Simple GIF Cap is one hotkey away: pick an area, record, stop, and the GIF is already on your clipboard.

## Features

- **Pick anything.** Drag a region and fine-tune it with handles, or hover and click a window. Space flips between the two.
- **Out of your way.** A 3-2-1 countdown, a dashed frame and a tiny floating Stop pill, none of which end up in the GIF.
- **One hotkey.** Run a record command again to stop.
- **Clipboard first.** The GIF is encoded, copied and previewed the moment you stop.
- **Trim and tune.** Cut the start or end, change frame rate or width, right from the preview.
- **Slack-sized.** Fit under 10 MB with one shortcut.
- **History.** Recent GIFs in a grid, ready to copy again.
- **Crisp output.** Uses [gifski](https://gif.ski) when installed, ffmpeg otherwise.

## Commands

| Command              | What it does                                                       |
| -------------------- | ------------------------------------------------------------------ |
| Record GIF of Region | Drag a region, or press Space to pick a window. Run again to stop. |
| Record GIF of Window | Hover and click the window to record. Run again to stop.           |
| Record GIF of Screen | Record the display under the mouse. Run again to stop.             |
| Stop GIF Recording   | Stop the running recording and open the preview.                   |
| Show Last GIF        | Preview, trim, shrink and copy the latest GIF.                     |
| Recent GIFs          | Browse, copy and edit your recent GIFs.                            |

Assign a hotkey to one of the record commands in Raycast settings and use it to both start and stop.

### Picker shortcuts

| Key                                | Action                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Drag                               | Draw a region; drag inside it to move, drag an edge or corner to resize |
| Click                              | Select the whole display (region mode) or the window (window mode)      |
| Space                              | Switch between region and window mode                                   |
| Enter, double click, Record button | Start recording                                                         |
| Esc                                | Cancel                                                                  |

### Preview shortcuts

| Shortcut                  | Action                        |
| ------------------------- | ----------------------------- |
| Enter                     | Copy GIF                      |
| Cmd+Shift+V               | Paste GIF to the active app   |
| Cmd+T                     | Trim and adjust               |
| Cmd+F                     | Fit under 10 MB               |
| Cmd+Shift+R / Cmd+Shift+W | Change frame rate / max width |
| Cmd+O / Cmd+Shift+F       | Open GIF / show in Finder     |
| Ctrl+X                    | Delete                        |

## Requirements

- macOS 13 or newer and [Raycast](https://raycast.com)
- Nothing else to use it. GIFs are encoded with macOS's own frameworks.
- Optional: `brew install ffmpeg` for smaller files, plus `brew install gifski` for sharper colors. Simple GIF Cap picks them up automatically.

## Configuration

Open Raycast Settings, go to Extensions and select Simple GIF Cap.

| Preference                      | Default        | Notes                                 |
| ------------------------------- | -------------- | ------------------------------------- |
| Save GIFs To                    | `~/Downloads`  | Folder for finished GIFs              |
| Frames per Second               | 15             | Higher is smoother but bigger         |
| Max Width                       | 1000 px        | Wider recordings are scaled down      |
| Encoder                         | Best Available | gifski, then ffmpeg, then built-in    |
| Countdown                       | 3 Seconds      | None, 3 or 5 seconds                  |
| Stop Automatically After        | 1 minute       | Keeps runaway recordings small        |
| Show mouse clicks / Show cursor | On             | Passed to `screencapture`             |
| ffmpeg Path                     | Homebrew       | Only needed for a non-Homebrew ffmpeg |

## Troubleshooting

- **Raycast asks to run "Show Last GIF"**: the recorder opens the preview through a deeplink, and Raycast confirms deeplinks from other apps. Choose **Always Run Command** once.
- **The recording is empty or fails**: give Raycast Screen Recording access in System Settings > Privacy & Security > Screen & System Audio Recording, then restart Raycast.
- **"ffmpeg not found"**: you forced the ffmpeg or gifski encoder. Install it with Homebrew, set the ffmpeg path, or switch the encoder back to Best Available.

## License

[MIT](LICENSE)
