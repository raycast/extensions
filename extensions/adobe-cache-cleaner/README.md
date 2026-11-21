# Adobe Cache Cleaner

A Raycast extension that finds Adobe caches and purges them, either one at a time or all at once.

## Commands

| Command | What it does |
| --- | --- |
| **Manage Adobe Caches** | Lists every cache with its size, grouped by app, with the icons of the apps that use it. Purge one or all of them, show a cache in Finder, or copy its path. |
| **Purge All Adobe Caches** | Purges everything in one go and shows how much space it freed. |

## Shortcuts (Manage Adobe Caches)

| Action | Shortcut |
| --- | --- |
| Purge selected cache | `↵` |
| Purge All | `⌃⇧X` |
| Copy Path | `⌘⌃C` |
| Refresh | `⌘R` |
| Copy Detected Locations | `⌘⇧D` |

## What it cleans

| Group | Location | Apps that must be closed |
| --- | --- | --- |
| Media Cache | `~/Library/Application Support/Adobe/Common/Media Cache Files`, `…/Media Cache`, `…/Peak Files`, plus any custom location set in Premiere/AE/AME preferences | Premiere Pro, After Effects, Media Encoder, Audition |
| After Effects | `Disk Cache - <Mac>.noindex` folders in your chosen Disk Cache folder (from `Adobe After Effects <ver> Prefs.txt`), in `~/Library/Caches/Adobe/After Effects/<ver>`, and stray Dynamic Link ones in `~/Library/Preferences/Adobe/After Effects/<ver>` | After Effects |
| Per app | `~/Library/Caches/Adobe/<App>` (Premiere Pro, Media Encoder, PProHeadless, Lightroom, …) | That app |
| Per app | `~/Library/Caches/com.adobe.*` | That app (Creative Cloud helpers: none) |
| Photoshop | `~/Library/Caches/Adobe Camera Raw*`, `Photoshop Temp*` scratch files in your temp folder | Photoshop (and Lightroom for Camera Raw) |
| Premiere & AME | `Adobe Premiere Pro Audio/Video Previews` folders Media Encoder leaves in the temp folder | Media Encoder, Premiere Pro |
| Shared | Font caches (`TypeSupport`, `Fonts`, `typequest`), `Color`, `CSXS` panel cache | Any Adobe app |
| Extra folders | Whatever you list in the settings | Any Adobe app |

The extension never deletes the cache folders themselves, only what's inside them, so the apps find their folders where they expect them. It never touches preferences, presets, Auto-Save, Creative Cloud Libraries or project preview renders.

## Safety

- A cache is **unsafe** while one of its apps is running. If you purge an unsafe cache, a warning dialog asks first.
  With **Purge All**, that dialog lets you purge everything anyway, or skip only the unsafe caches and purge the rest.
- Safe caches are purged right away, with no dialog.
- Rows tagged with an app name in orange are currently unsafe.

## Settings

- **Deletion**: cache files are deleted permanently by default. Turn on *Move to Trash* if you prefer the Trash; the space then comes back only after you empty it.
- **Auto-Detect** (on by default) reads custom cache locations from `~/Library/Preferences/com.Adobe.Common <ver>.plist` and the After Effects `Prefs.txt` files. These paths are used automatically.
- **Extra Cache Folders**: folders to empty, separated by semicolons. Raycast doesn't let an extension write its own settings, so run **Copy Detected Locations** (`⌘⇧D`) in *Manage Adobe Caches*, then paste the result here if you want the detected paths listed explicitly or want to edit them. Folders that are too broad (your home folder, `~/Library/Caches`, a drive's root, …) are refused.

## Note about disk space

After a big purge, macOS sometimes holds on to the space because of local Time Machine snapshots. The extension notices when that happens and tells you; the space comes back on its own.
