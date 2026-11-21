<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Ableton Project Manager icon" />
</p>

<h1 align="center">Ableton Project Manager</h1>

<p align="center">
  Browse, tag and listen to your Ableton Live projects and bounces, and organize them into collections on your Mac.
</p>

<p align="center">
  English | <a href="https://github.com/iyekChen/ableton-project-manager/blob/main/README.zh-CN.md">简体中文</a>
</p>

## ✨ What it does

- **[Browse and open your projects](#-projects)**, and **[tag them](#-tags)** by stage and genre.
- **[Find projects](#-search)** by name, tag, created date, key, BPM, and more.
- **[Gather your bounces](#-bounces)** from project folders, a shared export folder, or anywhere else.
- **[Listen to your bounces](#playback)** without digging through Finder.
- **[Plan the tracklist](#-collections)** for an EP or album, give tracks roles, and compare each track's energy.
- **[Keep notes and lyrics](#-notes--lyrics)** as Markdown files, in each project or in a folder such as an Obsidian vault.
- **[Start new Live Sets](#-new-live-sets)** from your templates.

See also: [Configuration](#-configuration) · [Known limitations](#-known-limitations) · [Data & files](#-data--files)

## 🚀 Quick start

| Command             | Use it to                                                          |
| ------------------- | ------------------------------------------------------------------ |
| **Search Projects** | Browse, play, and organize your projects and collections           |
| **Search Bounces**  | Find any bounce across all your projects                           |
| **Manage Tags**     | Edit your stages, genres, and track roles, and tag projects        |
| **Export Data**     | Back up your tags, collections, and other extension data to a file |
| **Import Data**     | Restore that data from an exported file                            |

Most of the time you'll use Search Projects. To get it ready:

### ① Set your Projects Folder

- Open Search Projects. On first launch, Raycast asks you to select the folder containing your Ableton Live projects.
- Each folder directly inside it that contains at least one `.als` file counts as a project. Folders nested deeper aren't found, so choose the folder that directly contains your project folders.

### ② Tell it where your bounces are

- In Extension Preferences, set Bounces Subfolder to the subfolder inside each project where you save bounces (e.g. `Bounces`), or leave it empty if they're saved directly in each project folder.
- Optional: if you also export bounces from all your projects into one folder, set it as the Shared Bounces Folder. Files there are matched to projects by name, and the next time you open Search Projects, it offers to review any that don't match; see [Shared Bounces Folder](#shared-bounces-folder).
- Optional: to include bounces stored anywhere else, select a project in Search Projects and use Manage External Bounce (⌘B).

### ③ Tag your projects

- In Manage Tags, select a stage (Demo, Mix, Released…) or genre and use Assign to Projects to tag several projects at once; see [Tags](#-tags).
- To tag a single project, use Edit Info in Search Projects.

### ④ Try it

- Select a project in Search Projects: Enter shows its Sets, ⌘O opens the latest one, and ⌘↵ plays its latest bounce. Press ⌘K to see every other action.

**You're all set.** Everything below covers each feature in detail, for when you want to dig deeper.

## 📁 Projects

Search Projects lists every project in your Projects Folder. Pinned projects stay at the top. The rest can be grouped by created or modified date and sorted by date or name.

### Opening Sets

- **View Sets** (Enter) lists a project's Sets. Open one in Ableton Live, or rename, duplicate, or move it to the Trash. Renaming asks you to close the Set in Live first.
- **Open Latest Set** (⌘O) opens the project's most recently modified Set.

### Overview and Detail

Search Projects has two views. Overview shows each project's stage and how many Sets and bounces it has. Detail adds a side panel with the project's note, its tags and collections, the latest Set's key and BPM, and its created and modified dates.

- ⌘⇧T switches between Overview and Detail.
- In Detail, ⌘⌥⇧T switches the panel between notes and lyrics; see [Notes & lyrics](#-notes--lyrics).

### Playback

There are two ways to listen: the built-in player plays a project's latest bounce in the background, and Quick Look previews any bounce.

- **Play Latest Bounce** (⌘↵) plays the project's latest bounce. Press it again to pause or resume.
- While something is playing, you can also use Stop Playback (⌘-), Backward and Forward (⌥← and ⌥→, 5 seconds), and Restart Track (⌘←).
- Playback keeps going when you close the Raycast window, and stops when Raycast quits.
- **Browse Bounces** (⌥↵) lists all of the project's bounces. Press Enter to preview any of them with Quick Look; see [Browse Bounces](#browse-bounces).

### Managing projects

- **Edit Info** changes a project's name, stage, genres, and collections. To tag several projects at once, use Assign to Projects in Manage Tags; see [Tags](#-tags). Renaming asks you to close the project in Live first, then renames its folder; tags, track numbers, roles, notes, and lyrics move with it.
- **Duplicate Project** copies the whole project folder under a new name (`Song copy` by default), including any bounces, notes, and lyrics saved inside it. Tags, collections, and pins aren't copied.
- **Pin** keeps a project at the top of the list. Pinned projects can be reordered with Move Up and Move Down.
- **Move to Trash** moves the whole project folder to the Trash. Its data is kept for 30 days in case you put it back; see [Project tracking](#project-tracking).
- **Copy Latest Bounce** copies the audio file itself, so you can paste it into a message or another app. You can also copy the project's name or path, or open it in Finder.

Other actions in Search Projects have their own chapters: [Collections](#-collections) (⌃↵), [Notes & lyrics](#-notes--lyrics), bounce sources in [Bounces](#-bounces) (⌘B), and [New Live Sets](#-new-live-sets).

## 🔖 Tags

Manage Tags edits the three lists you tag with. Use the dropdown next to the search bar to switch between them.

| List  | What it's for                                                                               | Defaults                                                                                |
| ----- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Stage | Where a project is in your workflow. A project has one stage at a time.                     | Demo, Recording, Production, Mix, Master, Done, Released                                |
| Genre | What kind of music it is. A project can have any number of genres.                          | House, Techno, Hip-Hop, Trap, Pop, R&B, Rock, Ambient, Experimental, Lo-Fi, Indie, Jazz |
| Role  | A track's part in a collection, such as an intro. It's set per collection, not per project. | Intro, Skit, Interlude, Outro                                                           |

### Editing the lists

- **Create** (⌘N) adds an option. **Edit** (⌘E) changes its name, aliases, and, for stages, its color. Renaming keeps the option on every project and track that uses it. Two options in the same list can't share a name.
- **Aliases** are other names to search by, separated by commas (e.g. `dnb` for Drum & Bass). See [Combined search](#combined-search).
- Reorder with Move Up (⌘⌥↑) and Move Down (⌘⌥↓), or Move to Top (⌘⇧↑) and Move to Bottom (⌘⇧↓). The same order is used everywhere you pick a tag.
- **Delete** (⌃X) asks first, telling you how many projects or tracks use the option, and then removes it from all of them.
- **Reset to Defaults** restores the default list for the list you're viewing. Your custom names, colors, aliases, and order are lost, and projects or tracks using an option that's no longer in the list lose it.

### Tagging projects

- **Assign to Projects** (stages and genres only) shows every project, with the ones that already have the tag checked. Check projects to add the tag and uncheck them to remove it. Because a project has only one stage, checking a project that's in another stage moves it, and the form tells you how many will move.
- To tag a single project, use Edit Info in Search Projects. To give a track a role, open Edit Info from inside a collection; see [Collections](#-collections).

## 🔍 Search

Search Projects matches what you type against each project's name, stage, genres, collections, and created year and month, as well as the key of its latest Set. To search by BPM or time signature, or to require every word to match, use combined search. Use the dropdown next to the search bar to show only one stage, genre, or year.

### Combined search

Start with `#` to combine filters; the space after it is optional (`# am` or `#am`). Every word must match, in any order, and the dropdown filter still applies. Typing `#` on its own shows a short reminder, with Open Search Help to come back here.

| Field          | What to type                                                                                                               | Examples                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Name           | Any part of the project name                                                                                               | `# demo`                                |
| Stage, genre   | The name or one of its aliases                                                                                             | `# mix`, `# rnb`, `# hiphop`            |
| Collection     | Any part of the collection name                                                                                            | `# collab`, `# album`                   |
| Created date   | A year, or an English month name or abbreviation                                                                           | `# 2025`, `# jun`                       |
| Key            | Root and scale with no space: `m`, `min`, or `minor`; `maj` or `major`; or another scale name. Write ♯ as `#` and ♭ as `b` | `# am`, `# c#m`, `# ebmaj`, `# ddorian` |
| BPM            | A tempo, with or without `bpm`, or a range                                                                                 | `# 120`, `# 90-100`                     |
| Time signature | Numerator and denominator                                                                                                  | `# 6/8`                                 |

For example, `# rnb 2025 am 120-128` finds R&B projects created in 2025, in A minor, at 120–128 BPM.

Things that are easy to miss:

- **Words match anywhere.** Each word can match a different field, and text matches any part of it: `# pop` finds the genre Pop and also a project called Popcorn. `# 2025` finds projects created in 2025 and projects with 2025 in their name.
- **Spelling is forgiving.** Case, spaces, punctuation, accents, and full-width characters are ignored, so `hiphop` finds Hip-Hop and `cafe` finds Café. `&` can be typed as `n` or `and`, so `rnb` and `randb` find R&B.
- **Short numbers are tempos.** Numbers with up to three digits are always read as BPM, so `# album 01` looks for a tempo of 1 instead of a collection called Album 01. Search by the words in the name instead.
- **Half and double tempo count.** `# 140` also finds projects at 70 and 280 BPM, and tempos are rounded, so 139.6 counts as 140. A range includes both ends and can be written either way round (`100-90`).
- **Keys and time signatures match whole.** `# cm` finds C minor only, not C major. A root on its own (`a`, `eb`) isn't a key search, and `# a minor` is read as two separate words. Both spellings of a black key work: `c#m` and `dbm` find the same projects. `6/8` doesn't match `6/4`.
- **Key, BPM, and time signature come from the latest Set.** They're read from each project's most recently modified Set in the background, then cached. Until a project's Set has been read, it doesn't match these words. The key comes from the Set's key and scale in Live, not from the audio, so a Set without a scale has no key.

## 🎧 Bounces

### Where bounces come from

A project's bounces are collected from:

- its Bounces Subfolder, or the project folder itself if Bounces Subfolder isn't set;
- the [Shared Bounces Folder](#shared-bounces-folder), for files whose names match the project;
- external folders and files added with Manage External Bounce (⌘B in Search Projects). Sources that can't be reached (e.g. an unplugged drive) are kept and shown as unavailable until you remove them. If a linked file is renamed in place or moved into your Shared Bounces Folder, it's re-linked automatically when there's a single match.

Only audio files directly inside each folder are read; subfolders aren't. A file reached through more than one source counts once. The most recently modified audio file (WAV, AIFF, MP3, M4A, or FLAC) is the latest bounce: it's the one that's played, copied, queued, and used for energy analysis.

### Browse Bounces

Browse Bounces (⌥↵ in Search Projects) lists all of a project's bounces, grouped by source.

- Press Enter to preview a bounce with Quick Look, or ⌘O to open it in its default app.
- Rename a bounce (its extension stays the same), copy the file itself, show it in Finder, or move it to the Trash.
- **Not This Project** sends a file from the Shared Bounces Folder back to [Unmatched Bounces](#unmatched-bounces) when it was matched to the wrong project.
- For an unavailable external source, **Remove External Source** removes it from the project. The file itself isn't deleted.

### Search Bounces

The Search Bounces command lists the bounces of every project in one place. A file that belongs to several projects appears once, next to all of their names.

- Search by file name or project name. Type `unmatched` to find files that don't belong to any project; they're marked with an orange question mark.
- Press Enter to preview a bounce with Quick Look. Browse Project Bounces (⌥↵) opens the bounces of the project the file belongs to, and Assign to Project gives an unmatched file to a project.
- Bounces are grouped by created date. Group by Source to see whether each file comes from a project folder, the shared folder, an external source, or is unmatched.

### Shared Bounces Folder

- A file belongs to a project when its name starts with the project name, followed by a space, `-`, `_`, `.`, or nothing else. `Song.wav`, `Song v2.wav`, and `Song-master.wav` all belong to `Song`; `Songbird.wav` doesn't. Case doesn't matter.
- Live names a new project's folder `<Name> Project`, so `Song.wav` doesn't match a project called `Song Project`. Rename the project, or add `Song` as a bounce alias (see below).
- If a file matches more than one project, the longest name wins: `Demo Package v2.wav` belongs to `Demo Package`, not `Demo`.
- **Bounce Aliases:** in Manage External Bounce, add other names a project's files start with (e.g. `SC` for `Summer Children`). An alias can't be another project's name or alias. This field only appears when a Shared Bounces Folder is set.
- **Renamed projects:** after a rename, the old name keeps matching only files created before the rename, so a new project with that name doesn't take them. Deselect a name under Previous Names in Manage External Bounce to stop matching it.

Assigning bounces never moves or renames your files.

### Unmatched bounces

When a Shared Bounces Folder is set, files in it that don't belong to any project are listed in Unmatched Bounces (⌘⇧B in Search Projects) and marked in [Search Bounces](#search-bounces). The first time you open Search Projects after setting or changing the folder, the extension offers to review any unmatched files it finds.

Use Assign to Project to give a file to a project:

- **All Files Starting With…:** adds the beginning of the file name as a bounce alias, so this file and future ones go to that project.
- **This File Only:** adds just this file as an external bounce.

## 💿 Collections

A collection is a group of projects, such as an EP, an album, or a set of collabs. A project can be in any number of collections, and it has a separate track number and role in each one.

### Building a collection

1. In Search Projects, use Browse Collections (⌃↵), then Create.
2. Open the collection and use Add Projects… to pick its tracks. You can also add a project to collections from its Edit Info.
3. New tracks wait in Unsorted. Press Enter to Set Track Number…, or use Add to Tracklist to give a track the next free number.

In Browse Collections, you can rename, pin, or delete collections. Deleting a collection doesn't delete its projects.

### Working with the tracklist

- **Tracklist** lists numbered tracks in order, with each track's role, number, duration, and energy. Its header shows the total duration. **Unsorted** lists the other tracks alphabetically.
- Reorder with Swap Up and Swap Down, or Move to Top and Move to Bottom. Remove from Tracklist sends a track back to Unsorted and clears its role. If two tracks share a number, both are marked with a warning icon.
- **Roles:** open Edit Info from inside a collection to give a track a role, such as Intro or Interlude. Edit the list of roles in [Manage Tags](#-tags).
- Use the dropdown to show only one stage or genre. The Detail view shows each track's note, stage, duration, role, BPM, key, time signature, and energy.
- **Remove from Collection** removes a track from the collection, along with its number and role there. The project itself isn't affected.
- Back to Search Projects (⌃↵) returns to your project list from anywhere in Browse Collections.

### Listening to a collection

- Play any track's latest bounce with ⌘↵, as in [Playback](#playback).
- **Queue Collection in Player** (⌘⇧↵) opens the latest bounce of every track in the Tracklist, in order, as an `.m3u` playlist in your default player. Unsorted tracks and tracks without a bounce are skipped, and the action is hidden while the Tracklist is empty. See [Known limitations](#-known-limitations) for player support.

### How energy is calculated

Energy helps you sequence a tracklist by comparing how dense, bright, and busy each track sounds next to the others in the collection. It isn't a rating of how good a track is.

What to know:

- Energy is relative to the collection. The same track can score differently in another collection.
- Only tracks in the Tracklist get a score. Unsorted tracks don't, and they don't affect anyone else's score.
- Set all three weights to Off in Extension Preferences to hide energy entirely.

**How it's measured.** When you open a collection, the latest bounce of every track is analyzed in the background; the header shows progress until it finishes. Results are cached and reused until the file changes. Three features are measured on a mono mix-down of the whole file:

- **Density:** crest factor (peak ÷ RMS). A lower crest factor means a denser, more compressed sound, so it scores higher.
- **Brightness:** the power-weighted spectral centroid. Brighter, more treble-heavy tracks score higher.
- **Movement:** spectral flux, how much the spectrum changes from one moment to the next. Busier tracks score higher. Flux is measured on a level-normalized spectrum, so loudness alone doesn't raise it.

Each feature is then scaled from 0 to 1 across the tracks in the collection's Tracklist: the lowest value becomes 0 and the highest becomes 1 (density is inverted). If every track has the same value, that feature counts as 0.5. The score is the weighted average of the three, using the Energy weights in Extension Preferences (Off = 0, Low = 0.5, Normal = 1, High = 2), and is shown as 1–5 dots colored from cool to warm.

- If a feature can't be measured (e.g. a silent bounce), the remaining weights are used. Tracks without a bounce show empty dots.

## 📝 Notes & lyrics

Each project can have a note and a lyrics file, saved as ordinary Markdown files.

- **Where they're saved:** `Notes.md` and `Lyrics.md` in the project folder by default. Set a Notes Folder or Lyrics Folder to keep them elsewhere, such as an Obsidian vault; see [File names](#file-names).
- **Viewing:** in Search Projects' [Detail view](#overview-and-detail) (⌘⇧T), the side panel shows the note, and ⌘⌥⇧T switches it to the lyrics.
- **Editing:** use Edit Note (⌘⌥N) and Edit Lyrics (⌘⌥L) to edit in Raycast, or Open Note (⌘⇧N) and Open Lyrics (⌘⇧L) to open the file in your Markdown app. These actions also work on tracks inside a collection.
- **Editing elsewhere:** changes made in other apps show up right away. If a file changes in another app while you're editing it in Raycast, you're asked before your save replaces those changes.

### Note templates

To use a template, set Notes Template or Lyrics Template in Extension Preferences to a `.md` file. A template is applied when a note or lyrics file is created, or when the existing file is empty. This covers Open Note, Open Lyrics, and the first save in Edit Note or Edit Lyrics.

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

### File names

- In a custom Notes Folder or Lyrics Folder, files are named `<Project Name>.md`. If notes and lyrics share the same folder, they are named `<Project Name> @Notes.md` and `<Project Name> @Lyrics.md`.
- Renaming a project in the extension or in Finder also renames its note and lyrics files.
- Characters that are unsafe in file names or special in Obsidian (`/ \ : * ? " < > | # ^ [ ]`) are replaced with full-width look-alikes, so `Beat #3` becomes `Beat ＃3.md`. If two project names would still end up with the same file, the extension won't read or write it until you rename one of them.

## 🎹 New Live Sets

In Search Projects:

- **New Live Set** (⌘N) launches Ableton Live, which opens a new Set from your Default Set. If Live is already running, it's brought to the front instead.
- **New Live Set from Template** (⌘⌥⌃N) lists your templates. Choose one to open it in Ableton Live as a new Set: saving asks for a new name, so the template itself stays unchanged.

### Templates

- Templates are the `.als` files in your Templates Folder, which defaults to `~/Music/Ableton/User Library/Templates`.
- Templates at the top level form one group, and each subfolder forms its own group. Folders nested deeper aren't read.
- You can rename a template or move it to the Trash from the list.

## 🔧 Configuration

| Preference                | Description                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Projects Folder**       | The folder containing your Ableton Live projects.                                                                                                                      |
| **Shared Bounces Folder** | One folder for bounces from all your projects. Files are matched to projects by name; see [Shared Bounces Folder](#shared-bounces-folder).                             |
| **Bounces Subfolder**     | The subfolder inside each project where bounces are saved (e.g. `Bounces`). Leave empty to look directly in each project folder.                                       |
| **Templates Folder**      | The folder that holds your Live templates. Leave empty to use `~/Music/Ableton/User Library/Templates`; see [Templates](#templates).                                   |
| **Notes Folder**          | The folder where notes are saved as `.md` files (e.g. an Obsidian vault). Leave empty to save `Notes.md` in each project folder.                                       |
| **Lyrics Folder**         | The folder where lyrics are saved as `.md` files. Leave empty to save `Lyrics.md` in each project folder.                                                              |
| **Notes Template**        | Optional `.md` file used as the starting point for new notes; see [Note templates](#note-templates).                                                                   |
| **Lyrics Template**       | Optional `.md` file used as the starting point for new lyrics; see [Note templates](#note-templates).                                                                  |
| **Strict Line Breaks**    | Off: preserve single line breaks. On: follow standard Markdown line breaks (two trailing spaces or a blank line). Affects the preview only; your files aren't changed. |
| **Energy: Density**       | How much density (crest factor) affects the energy score; see [How energy is calculated](#how-energy-is-calculated). Only the ratio between the three weights matters. |
| **Energy: Brightness**    | How much brightness (spectral centroid) affects the energy score.                                                                                                      |
| **Energy: Movement**      | How much movement (spectral flux) affects the energy score.                                                                                                            |

## 🚧 Known limitations

- **Queue Collection in Player:** use a player that supports `.m3u` playlists, such as IINA, VLC, or Swinsian. QuickTime Player doesn't.
- **Renaming files externally:** if you rename a note or lyrics `.md` file yourself, the extension can no longer find it.
- **Moving custom folders:** if a custom notes or lyrics folder is renamed or moved, the extension shows a warning and won't write anything until you choose the folder again in Extension Preferences.
- **Same-named projects across libraries:** extension data is stored by project folder name, so if you switch to a different Projects Folder that contains a project with the same name, it shows the same tags and collections.
- **Changing note and lyrics folders:** if notes and lyrics start or stop sharing the same custom folder, their file names switch between `<Project Name>.md` and `<Project Name> @Notes.md` / `@Lyrics.md`. Existing files aren't renamed, so rename them yourself to keep them linked.

## 📦 Data & files

### What changes on disk

The extension changes project files only when you ask:

- renaming a project (in Edit Info), a Set, a bounce, or a template;
- duplicating a project or a Set;
- moving something to the Trash.

Renaming a project or Set asks you to close it in Ableton Live first. Notes and lyrics are written only when you edit them, or when you use Open Note or Open Lyrics before the file exists. They're renamed or archived along with their project, as described in [Project tracking](#project-tracking).

### Storage

The extension stores its own data in Raycast:

- **LocalStorage:**
  - Your data: stages, genres, roles, and collections; each project's tags, collections, pin, external bounce sources, and Shared Bounces Folder matching (bounce aliases, previous names, and files marked Not This Project); track numbers and roles; pinned collections.
  - Records: grouping choices in Browse Bounces and Search Bounces; the project list used to detect Finder changes; records of deleted projects.
  - Caches: Set metadata and bounce analysis.
- **Cache:** view mode, sort, and grouping choices in Search Projects; bounce counts; and the last project and bounce lists, so Search Projects and Search Bounces show your list right away while they check for changes.

Raycast keeps this data per extension. Uninstalling the extension deletes it, so run Export Data first if you might reinstall. Your projects, notes, and lyrics are ordinary files and aren't affected.

### Export & import

- **Export Data** saves your tags and tag lists, collections, pins, track numbers, roles, bounce sources and aliases, and recently deleted projects to a `.json` file in a folder you choose. Extension preferences, notes, and lyrics aren't included.
- **Import Data** replaces the data of every project that existed at export time with what's in the file, so changes you've made to those projects since the export are undone. Projects added since then keep their data. If a newer project's track number collides with one from the file, that project moves to Unsorted. Projects renamed since the export are matched by their folder.
- If any of your current data would change, Import Data first shows what will change and saves a backup of your current data next to the imported file.
- Files exported by a different extension can't be imported.

### Project tracking

While Search Projects is open, it watches your Projects Folder and reloads when projects are added, renamed, removed, or put back. Changes made while it was closed are applied the next time you open it.

- **Renames:** a project renamed in Finder is recognized by its folder's creation time and file system ID (inode), so its tags, track numbers, roles, notes, and lyrics move with it. Duplicating a folder and deleting the original is not mistaken for a rename.
- **Deletions:** if Raycast has Full Disk Access and the folder is found in the Trash, its data is set aside for 30 days, just like Move to Trash. Without Full Disk Access, nothing is cleared automatically. A toast lets you open the Full Disk Access settings, and Clean Up Leftovers (in the Action Panel when there is something to clean up) clears data for projects you removed.
- **Missing drive:** if every project disappears, or more than half of them (and more than three) disappear at once, nothing is changed. A toast suggests checking the drive or the Projects Folder setting.
- **Separate folders:** each Projects Folder keeps its own project list, so switching folders doesn't look like mass deletion.
- **Trash recovery:** moving a project to Trash keeps its tags, collections, track numbers, and roles for 30 days. Notes and lyrics stored in custom folders move into a `Deleted Projects/` subfolder. Put the folder back from the Trash within that time and everything is restored. Collections deleted in the meantime are skipped, and nothing overwrites data you've added since.
- **New projects:** a new folder that happens to share a deleted project's name doesn't inherit its data.
