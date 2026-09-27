# Renamer Desktop Search

Search desktops you've named with [Renamer](https://github.com/Newsworld-niu/Renamer), then press Return to switch. The checkmark marks the current desktop on each display.

## Setup

1. Install [Renamer 0.1.1 or newer](https://github.com/Newsworld-niu/Renamer/releases) in `/Applications`. Renamer supports Apple silicon Macs running macOS 14 or later. Launch it once and grant Accessibility access in macOS System Settings when prompted.
2. Name your desktops in Renamer. In Raycast, open **Search Desktops** and type a name.
3. If you installed Renamer elsewhere, set **Renamer App Path** in this extension's preferences to the full path of `Renamer.app`.

The command reads the desktop list directly from the installed app, so it can show names even when Renamer is closed. Switching opens Renamer when needed. Renamer's **Enable desktop search** setting controls its own search window and shortcut; it does not disable this Raycast command. Desktop names remain on your Mac. The extension makes no network requests.

## Development

This extension is maintained in the [Renamer repository](https://github.com/Newsworld-niu/Renamer/tree/main/raycast). From its `raycast` directory, run `npm ci`, `npm run dev`, `npm run build`, and `npm run lint`. For a local app build, see the repository's build instructions.
