<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Ableton Project Manager icon" />
</p>

<h1 align="center">Ableton Project Manager</h1>

<p align="center">
  Browse, organize, and listen to your Ableton Live projects from Raycast.
</p>

<p align="center">
  English | <a href="README.zh-CN.md">简体中文</a>
</p>

## 🚀 Quick start

### ① Set your Projects Folder

- Open Search Projects. On first launch, Raycast asks you to select the folder containing your Ableton Live projects.

### ② Configure your bounces

- In Bounces Subfolder, enter the name of the subfolder where you save bounces (e.g. `Bounces`), or leave it empty if they're saved directly in each project folder.
- To include bounces stored outside a project folder, use Manage External Bounce on that project in Search Projects.

### ③ Tag your projects

- In Manage Tags, select a stage or genre and use Assign to Projects to tag multiple projects at once.
- To tag a single project, use Edit Info.

### ④ Build a collection

1. In Search Projects, use Browse Collections, then Create.
2. Open the collection and use Add Projects.
3. Give each track a number with Set Track Number or Add to Tracklist. Numbered tracks form the Tracklist; the rest wait in Unsorted.

## ⚙️ Configuration

| Preference             | Description                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Projects Folder**    | The folder containing your Ableton Live projects.                                                                                                                      |
| **Bounces Subfolder**  | The subfolder inside each project where bounces are saved (e.g. `Bounces`). Leave empty to look directly in each project folder.                                       |
| **Notes Folder**       | The folder where notes are saved as `.md` files (e.g. an Obsidian vault). Leave empty to save `Notes.md` in each project folder.                                       |
| **Lyrics Folder**      | The folder where lyrics are saved as `.md` files. Leave empty to save `Lyrics.md` in each project folder.                                                              |
| **Notes Template**     | Optional `.md` file used as the starting point for new notes. Supports `{{title}}`, `{{date}}`, and `{{time}}`.                                                        |
| **Lyrics Template**    | Optional `.md` file used as the starting point for new lyrics. Supports `{{title}}`, `{{date}}`, and `{{time}}`.                                                       |
| **Strict Line Breaks** | Off: preserve single line breaks. On: follow standard Markdown line breaks (two trailing spaces or a blank line). Affects the preview only; your files aren’t changed. |
| **Energy: Density**    | How much density (crest factor) affects the energy score. Only the ratio between the three weights matters.                                                            |
| **Energy: Brightness** | How much brightness (spectral centroid) affects the energy score.                                                                                                      |
| **Energy: Movement**   | How much movement (spectral flux) affects the energy score.                                                                                                            |

### Projects

Each folder directly inside your Projects Folder that contains at least one `.als` file counts as a project. Folders nested deeper aren't found.

### Bounces

The most recently modified audio file (WAV, AIFF, MP3, M4A, or FLAC) is played as the latest bounce and used for energy analysis.

### Templates

A template is applied when a note or lyrics file is created, or when the existing file is empty. This covers Open Note, Open Lyrics, and the first save in Edit Note.

| Placeholder | Becomes                      | Default format |
| ----------- | ---------------------------- | -------------- |
| `{{title}}` | The project name             | —              |
| `{{date}}`  | The date the file is created | `YYYY-MM-DD`   |
| `{{time}}`  | The time the file is created | `HH:mm`        |

`{{date}}` and `{{time}}` accept a custom format, as in Obsidian: `{{date:YYYY/MM/DD}}`, `{{date:MMMM D, YYYY}}`, `{{time:HH.mm}}`. Supported tokens are `YYYY` `YY` `MMMM` `MMM` `MM` `M` `DD` `D` `dddd` `ddd` `HH` `mm`; text in `[brackets]` is kept as-is.

YAML frontmatter is hidden in the Raycast preview and kept intact when you edit in Raycast, so a template like this works well with Obsidian:

```yaml
---
title: "{{title}}"
date: "{{date}}"
time: "{{time}}"
tags:
  - ableton_live
  - project-note
---
```

### How energy is calculated

Energy helps you sequence a tracklist by comparing how dense, bright, and busy each track sounds next to the others in the collection. It isn’t a rating of how good a track is.

When you open a collection, the latest bounce of every track is analyzed in the background; the header shows progress until it finishes. Results are cached and reused until the file changes. Three features are measured on a mono mix-down of the whole file:

- **Density:** crest factor (peak ÷ RMS). A lower crest factor means a denser, more compressed sound, so it scores higher.
- **Brightness:** the power-weighted spectral centroid. Brighter, more treble-heavy tracks score higher.
- **Movement:** spectral flux, how much the spectrum changes from one moment to the next. Busier tracks score higher. Flux is measured on a level-normalized spectrum, so loudness alone doesn't raise it.

Each feature is then scaled from 0 to 1 across the tracks in the collection's Tracklist: the lowest value becomes 0 and the highest becomes 1 (density is inverted). If every track has the same value, that feature counts as 0.5. The score is the weighted average of the three, using Off = 0, Low = 0.5, Normal = 1, High = 2, and is shown as 1–5 dots colored from cool to warm.

- Energy is relative to the collection. The same track can score differently in another collection.
- Only tracks in the Tracklist get a score. Unsorted tracks don't, and they don't affect anyone else's score.
- If a feature can't be measured (e.g. a silent bounce), the remaining weights are used. Tracks without a bounce show empty dots.
- Set all three weights to Off to hide energy entirely.

## 🗄️ Data & files

### What changes on disk

Project files change only when you ask: renaming a project in Edit Info, renaming or duplicating a Set, renaming a bounce, duplicating a project, or moving something to Trash. Renaming a project or Set asks you to close it in Ableton Live first. Notes and lyrics are written only when you edit or open them, and are renamed or archived along with their project as described below.

### Storage

The extension stores its own data in Raycast:

- **LocalStorage:** stages, genres, roles, and collections; each project's tags, collections, pin, and external bounce sources; track numbers and roles; pinned collections; the project list used to detect Finder changes; records of deleted projects; and cached Set metadata and bounce analysis.
- **Cache:** view mode, sort, and grouping choices, and bounce counts.

Raycast keeps this data per extension. Uninstalling the extension deletes it. Your projects, notes, and lyrics are ordinary files and aren't affected.

### Project tracking

While Search Projects is open, it watches your Projects Folder and reloads when projects are added, renamed, removed, or put back. Changes made while it was closed are applied the next time you open it.

- **Renames:** a project renamed in Finder is recognized by its folder's creation time and inode, and its tags, track numbers, roles, and notes move with it. Duplicating a folder and deleting the original is not mistaken for a rename.
- **Deletions:** if Raycast has Full Disk Access and the folder is found in the Trash, its data is archived and cleared, just like Move to Trash. Without Full Disk Access, nothing is cleared automatically. A toast lets you open the Full Disk Access settings, and Clean up Leftovers (in the Action Panel when there is something to clean up) clears data for projects you removed.
- **Missing drive:** if every project disappears, or more than half of them (and more than three) disappear at once, nothing is changed. A toast suggests checking the drive or the Projects Folder setting.
- **Separate folders:** each Projects Folder keeps its own project list, so switching folders doesn't look like mass deletion.
- **Trash recovery:** moving a project to Trash keeps its tags, collections, track numbers, and roles for 30 days. Notes and lyrics stored in custom folders move into a `Deleted Projects/` subfolder. Put the folder back from the Trash within that time and everything is restored. Collections deleted in the meantime are skipped, and nothing overwrites data you've added since.
- **New projects:** a new folder that happens to share a deleted project's name doesn't inherit its data.

### Notes & lyrics

- In a custom folder, files are named `<Project Name>.md`. If notes and lyrics share the same folder, they are named `<Project Name> @Notes.md` and `<Project Name> @Lyrics.md`.
- Renaming a project in the extension or in Finder also renames its note and lyrics files.
- Characters that are unsafe in file names or special in Obsidian (`/ \ : * ? " < > | # ^ [ ]`) are replaced with full-width look-alikes, so `Beat #3` becomes `Beat ＃3.md`. If two project names would still end up with the same file, the extension won't read or write it until you rename one of them.

## ⛓️ Known limitations

- **Queue Collection in Player:** use a player that supports `.m3u` playlists, such as IINA, VLC, or Swinsian. QuickTime Player doesn't.
- **Renaming files externally:** if you rename a note or lyrics `.md` file yourself, the extension can no longer find it.
- **Moving custom folders:** if a custom notes or lyrics folder is renamed or moved, the extension shows a warning and won't write anything until you choose the folder again in Extension Preferences.

## 🛠️ For developers

Requires Node.js 22+ and npm.

```bash
git clone https://github.com/iyekChen/ableton-project-manager.git
cd ableton-project-manager
npm install
npm run dev        # Run the extension in Raycast development mode
```

Checks and builds:

```bash
npm run lint       # ESLint + Prettier
npm run fix-lint   # Auto-fix lint and formatting issues
npm test           # Run unit tests with Vitest
npm run build      # Build the production extension
```

The audio player binary (`assets/audio-player`) is committed, so you don't need to build it to run the extension. If you change [`swift/AudioPlayer.swift`](swift/AudioPlayer.swift), rebuild it and commit both the binary and `swift/AudioPlayer.swift.sha256`:

```bash
npm run build:player   # Requires Xcode Command Line Tools (swiftc, lipo)
```

CI runs lint and tests, checks that the player was rebuilt after the last change to its Swift source, then builds the player and the extension.

### How it works

- **Live Sets:** `.als` files are gzipped XML. Each Set is streamed through gunzip and parsed with [`saxes`](https://github.com/lddubeau/saxes) to read tempo, time signature, and scale.
- **Playback:** a small Swift binary built on AVFoundation plays bounces as a detached process, so playback survives view changes and closing the Raycast window. The extension controls it through command and status files in its support folder. The player stops on its own when Raycast quits.
- **Analysis:** the same binary has an `analyze` mode that streams the file in chunks and computes RMS, peak, spectral centroid, and spectral flux using a 2048-point FFT, without loading the whole file into memory.
- **Build:** [`scripts/build-audio-player.sh`](scripts/build-audio-player.sh) compiles a universal arm64 + x86_64 binary targeting macOS 11 and records the source hash that CI checks.
