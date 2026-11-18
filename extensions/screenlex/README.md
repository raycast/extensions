# ScreenLex for Raycast

Capture, translate, and manage screenshots with ScreenLex without leaving Raycast. The extension sends local deep links to the ScreenLex Mac app; capture permissions, OCR, translation settings, and API credentials remain managed by ScreenLex.

## Requirements

- macOS 14.6 or later
- [Raycast](https://www.raycast.com/)
- A ScreenLex build with Raycast integration from [screenlex.cc](https://www.screenlex.cc)
- Screen Recording permission for ScreenLex when using capture or screenshot translation commands
- Node.js 22.22.2 or later for extension development

Launch ScreenLex once before using the extension so macOS can register the `screenlex-v1://` deep-link scheme.

## Commands

| Command | Description |
| --- | --- |
| Capture Area | Select and capture a region. |
| Capture Window | Select and capture a window. |
| Capture Full Screen | Capture the current display. |
| Translate Area | Select a region and translate its text. |
| Translate Window | Select a window and translate its text. |
| Translate Full Screen | Capture the current display and translate its text. |
| Open History | Show the recent screenshots panel. |
| Open ScreenLex | Open the ScreenLex main window. |
| Open Settings | Open ScreenLex settings. |

You can assign a global hotkey to any direct command in Raycast Settings.

## Compatibility

The extension requires a ScreenLex version that supports the `screenlex-v1://` scheme. Older ScreenLex builds only register `screenlex://` and cannot run these commands. If Raycast asks you to update ScreenLex, install the latest available build and launch it once.

## Privacy

The extension does not read or store screenshots, recognized text, translation results, or API keys. Screen capture and OCR are performed by the ScreenLex app. Depending on the translation mode selected in ScreenLex, recognized text may be processed on device or sent to the configured translation provider.

## Development

```bash
npm install
npm run dev
```

Before submitting a change, run:

```bash
npm test
npm run lint
npm run build
```
