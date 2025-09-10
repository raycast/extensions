# Toggle Fn

A Raycast extension to quickly toggle the "Use all F1, F2, etc. keys as standard function keys" option in macOS System Settings.

## Installation

Install this extension from the [Raycast Store](https://www.raycast.com/store) or run:

```bash
npm install -g @raycast/api && npx @raycast/api publish
```

## Usage

1. Open Raycast (⌘ + Space)
2. Type "Toggle Fn" or "Function Keys"
3. Press Enter to toggle the setting
4. You'll see a notification confirming the change

## Features

- **Quick Toggle**: Instantly switch between function keys and media keys mode
- **Visual Feedback**: System notifications provide essential feedback
- **System Integration**: Works directly with macOS System Settings
- **State Verification**: Confirms the setting actually changed
- **Clean User Experience**: Minimal notifications focused on what matters

## Compatibility

Tested and working on:

- macOS Sequoia (15.x) - Latest
- macOS Sonoma (14.x)
- macOS Ventura (13.x)
- macOS Monterey (12.x)
- macOS Big Sur (11.x)

## Troubleshooting

**Extension not working?**
- Ensure Accessibility permissions are granted to Raycast
- Try running the command twice if System Settings is slow to respond
- Check that System Settings is not already open and locked

**Permission Issues?**
- Go to System Settings > Privacy & Security > Accessibility
- Add Raycast to the list of allowed applications

## Development

To build and test locally:

```bash
npm install
npm run dev
```

To build for distribution:

```bash
npm run build
npm run lint
```

## Attribution

Thanks to [MrSimonC](https://github.com/MrSimonC/Toggle-Mac-Function-Keys) for the initial AppleScript implementation that inspired this extension.
