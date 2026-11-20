# Eject Disk Images

Eject every mounted disk image (`.dmg`, `.iso`, `.sparseimage`, `.sparsebundle`) in one go, while your internal disk, external HDDs and SSDs, USB flash drives and SD cards stay mounted.

It's a must-have if you install apps in batches from `.dmg` files: every installer leaves a mounted volume behind, and they quickly pile up in the Finder sidebar and on the desktop. One hotkey clears them all at once instead of ejecting each one by hand.

## How It Tells Images From Real Drives

The extension reads the list from `hdiutil info`, which only contains images attached through macOS's disk image framework. Physical drives never appear in that list, so they can't be ejected by mistake. Each image is detached by its whole-disk device (`hdiutil detach /dev/diskN`), which unmounts all of its partitions at once.

## Commands

- **Eject All Disk Images** ejects everything at once and confirms with a HUD. Assign it a hotkey for one-press use.
- **Manage Disk Images** lists mounted images so you can eject them one at a time.

| Action                    | Shortcut |
| ------------------------- | -------- |
| Eject                     | `↵`      |
| Eject All                 | `⌘ ⇧ E`  |
| Open Volume               | `⌘ O`    |
| Show Image File in Finder | `⌘ ⇧ F`  |
| Copy Image Path           | `⌘ ⇧ .`  |
| Refresh                   | `⌘ R`    |
| Force Eject               | `⌃ X`    |

## Preferences

- **Force Eject** (off by default): retry images that are busy with `hdiutil detach -force`. Unsaved data on the image may be lost.
- **Skip Backups** (on by default): leave Time Machine and `.backupbundle` images mounted so backups aren't interrupted.
- **Exclude Images**: comma-separated text fragments. Any image whose file path or volume name contains one of them stays mounted.
