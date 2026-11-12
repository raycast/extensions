# Dock Cleanup

Type "Dock Cleanup" in Raycast and press Return. Your cursor turns into a crosshair: drag a box over some Dock icons and let go. A small panel lists the apps you caught, and when you confirm, they quit and are taken out of the Dock.

- Every app icon the box touches counts, including apps in the Dock's Recents section.
- Running apps quit the normal way, so an app with unsaved work can ask you to save first. Its icon is removed once it has quit; if you cancel the save, the app stays.
- Folders, minimized windows, Finder and Trash are never touched.
- Escape, a right-click, or a click outside the panel cancels.

## Setup

Raycast needs **Accessibility** access to find the icons in your Dock and remove them: **System Settings → Privacy & Security → Accessibility**, then turn on Raycast. If it's missing, the command says so and opens the setting for you.

Icons are removed through each icon's own Dock menu (Options → Remove from Dock), which only exists with those English titles. On a Mac set to another language, the extension edits the Dock's saved list instead and restarts the Dock, so the icons blink for a second.

## Protected apps

In the command's preferences, list apps a sweep should never quit or remove, by name or bundle ID, separated by commas (for example `Terminal, Notes, com.spotify.client`). They show up grey with a lock while you drag.

## Menu bar version

The same sweep is also available as a standalone menu bar app with a Ctrl-Option-D shortcut: [github.com/alaramartin/dock-cleanup](https://github.com/alaramartin/dock-cleanup). You don't need it for this extension.
