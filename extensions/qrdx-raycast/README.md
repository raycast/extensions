# QRdx for Raycast

Make styled QR codes in Raycast with [`qrdx`](https://www.npmjs.com/package/qrdx), the open-source QR code library from [QRdx](https://qrdx.dev). The codes are drawn on your Mac, so you don't need a QRdx account or an API key.

## Commands

- **Generate QR:** enter a URL, an email address, a phone number or any text. Pick the body pattern, eye frame, eye center and call-to-action frame from previews, then set the colors, the frame's label (such as "Scan me"), a logo, the size and the quiet zone. Copy the code as PNG or SVG, save either to your Downloads folder, or save its settings to Saved QR Codes.
- **Saved QR Codes:** browse the codes you saved, with a preview and the settings of the selected one beside the list. Edit, export or delete them. They're kept in Raycast's local storage.
- **Generate QR with AI:** describe the code you want and Raycast AI fills in the settings. If the description doesn't say what to encode, you can enter it yourself. This command needs access to Raycast AI; Generate QR makes the same codes without it.

**Open in QRdx Playground** (⌘O) opens the full editor at qrdx.dev with the code's web address. Other content, colors and patterns stay in Raycast.

The patterns and frames are the ones `qrdx` offers: every body pattern, eye frame, eye center and call-to-action frame in the library.

## Raycast AI

Mention QRdx in Raycast AI and ask for a code, for example "make a QR for https://qrdx.dev with a frame that says Scan for the menu". The AI picks the patterns, colors and frame from your words and saves the PNG to your Downloads folder. It can also list and search your saved codes.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| ⌘1, ⌘2, ⌘3, ⌘4 | In Generate QR's form, pick the body pattern, eye frame, eye center or frame from previews |
| ⌘C, ⌘⇧C | Copy the code as PNG, copy it as SVG |
| ⌘⇧S, ⌥⌘S | Save the PNG or the SVG to your Downloads folder |
| ⌘S | On a code's preview, save it to Saved QR Codes |
| ⌘E | Edit the code |
| ⌘O | Open in QRdx Playground |

The extension's source is in the [QRdx repository](https://github.com/qrdxinc/qrdx/tree/main/plugins/raycast).
