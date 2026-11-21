# CleanShotZ for Raycast

Raycast commands for [CleanShotZ](https://github.com/houseofmackee/cleanshotz),
the free and open source screenshot app for macOS. Every command opens a
`cleanshotz://` URL, so CleanShotZ must be installed; nothing else is
needed. Install it with [Homebrew](https://brew.sh):

```sh
brew install --cask houseofmackee/tap/cleanshotz
```

or download it from the
[releases](https://github.com/houseofmackee/cleanshotz/releases).

| Command | What it does |
| --- | --- |
| Capture Area | Select an area and capture it |
| Capture Previous Area | Capture the last selected area again |
| Capture Fullscreen | Capture the display under the pointer |
| Capture Window | Pick a window and capture it |
| Self-Timer | Select an area, then capture after a countdown |
| Scrolling Capture | Capture content that scrolls |
| Capture Text | Copy the text (or QR code) in an area |
| Pick Color | Copy a color from the screen as hex |
| Step Capture | Capture the window under the pointer at every click, for a step-by-step guide |
| Record Screen | Start or stop a recording |
| Open Capture History | Show recent captures |
| Restore Recently Closed | Show the last closed Quick Access thumbnail |
| Annotate Clipboard Image | Open the clipboard image in the editor |
| Toggle Desktop Icons | Hide or show desktop icons and widgets |
| Annotate Selected File | Open the image selected in Finder in the editor |
| Pin Selected File | Pin the image selected in Finder |
| Run Pipeline on Selected File | Run a pipeline from the settings file on it |

## Development

```sh
npm install
npm run dev     # loads the extension into Raycast
npm run build
npm run lint
```
