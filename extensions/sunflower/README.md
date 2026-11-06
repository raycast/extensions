# Sunflower

Control [Sunflower for Mac](https://sunflower.karakabakov.com/) from Raycast. Sunflower is the disk space analyzer by Gjorge Karakabakov.

## What's new

- A **Disks** section shows free space and usage for every mounted volume, colour-coded as it fills up.

## Commands

- **Control Sunflower** — search for a view, navigate the current scan, rescan the selected disk, preview the selected item, or reveal it in Finder.
- **Show Largest Files** — switch Sunflower to its Largest view for the current folder. Assign a Raycast hotkey to reach it directly.
- **Rescan Disk** — request another scan of the disk selected in Sunflower. The command confirms the request; Sunflower displays scan progress and results.

The six views are Rings, Treemap, List, Largest, Kinds, and Untouched. Navigation includes Back, Forward, and Enclosing Folder. Actions apply to Sunflower's current disk, folder, and selected item.

## Requirements

1. Sunflower 1.2 or later, with its English menus, on an Apple silicon Mac with macOS 15 or later.
2. Raycast permission under **System Settings → Privacy & Security → Accessibility**.
3. Allow Raycast to control **System Events** under **Privacy & Security → Automation** when macOS asks.
4. Select a disk and complete a scan in Sunflower before using views or navigation. Select an item before Quick Look or Reveal in Finder.

The extension identifies Sunflower by its bundle identifier (`com.sunflower.app`) and uses the app's native menu actions. Sunflower may need Full Disk Access to include protected locations in its scan; that permission belongs to Sunflower, rather than this extension.

## Scope

This extension controls the supported menus introduced in [Sunflower 1.2](https://sunflower.karakabakov.com/whats-new/). Sunflower does not document an API for searching or exporting its scan data, so results remain in the app. Unavailable native commands show a failure message rather than a success acknowledgement.

Deletion, uninstalling applications, reclaiming storage, and granting administrator scanning rights remain in Sunflower's interface. The extension has no deletion commands. It makes no network requests and does not read files from your scan.

Raycast already includes app launching and Search Menu Bar Items. This package adds direct Sunflower view and rescan commands plus a focused control list, rather than a general disk scanner.

## Development

```sh
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

Author: **itsdanielsultan**. This is an independent Raycast integration; Sunflower and its app icon belong to its developer.

The extension source is licensed under MIT. The Sunflower app icon is a third-party identification asset and is not relicensed by the extension's MIT license.
