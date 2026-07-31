# FrameMind for Raycast

Search, capture, and work with your local FrameMind screenshot library without
leaving Raycast.

## Requirements

- macOS 15 or newer on Apple silicon
- [FrameMind](https://framemind-macos.kobyof.chatgpt.site) installed in
  `/Applications`

The signed command bridge is embedded in the FrameMind app. If you installed it
somewhere else, update **FrameMind CLI Path** in this extension's preferences.

## Commands

- **Search Screenshots** searches the local FrameMind library.
- **Recent Screenshots** shows the latest local results.
- **Capture** opens FrameMind's capture review.
- **Ask Screen** opens an editable, unsent request in FrameMind.
- **Copy OCR** copies locally indexed OCR when you explicitly run the command.
- **Open Result** opens a FrameMind item by identifier.

Search and OCR lookup are read-only. Capture and Ask Screen always use
FrameMind's foreground review and cannot bypass its privacy settings. Copy OCR
changes the clipboard only in direct response to your Raycast action. The
extension has no analytics, network client, or upload code.

## Development

Run `npm ci`, `npm run lint`, `npm run lint:store`, and `npm run build` before
publishing. `npm run dev` imports a local development copy into Raycast.
