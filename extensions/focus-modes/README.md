# Focus Modes

Switch between your macOS Focus modes, like Do Not Disturb, Work, Sleep, or any Focus you've created yourself, right from Raycast.

## Commands

- **Set Focus Mode**: See all your Focus modes and which one is on, then turn one on or off. Use **Create Quicklink** on any Focus to give it its own hotkey.
- **Turn On Focus**: Type the name of a Focus (or just the start of it, like `wo` for Work) to turn it on.
- **Turn Off Focus**: Turn off whichever Focus is on.

## Setup

macOS doesn't offer a public way for apps to change Focus, so this extension uses the built-in Shortcuts app. There are two one-time steps:

1. **Full Disk Access**: macOS only lets apps with Full Disk Access read your list of Focus modes. If Raycast doesn't have it yet, the extension shows a button that opens **System Settings → Privacy & Security → Full Disk Access**. Turn on Raycast there (macOS may ask you to quit and reopen Raycast), then open the command again.
2. **Helper shortcut**: The first time you change Focus, the extension creates a shortcut called **Raycast Focus Modes** from your Focus modes and opens it in Shortcuts. Click **Add Shortcut** and your Focus switches as soon as it's added.

If you add a new Focus later, Shortcuts will open again with an updated helper. Click **Add Shortcut**, then **Replace**. If Shortcuts keeps more than one copy, the extension uses the newest one, and you can delete the others.

## Privacy

The extension reads the Focus names, icons, and colors from `~/Library/DoNotDisturb/DB` to show your modes and which one is on. Nothing leaves your Mac. The helper shortcut only contains **Set Focus** actions for your own Focus modes, and you can open it in Shortcuts to see exactly what it does.
