# Ableton Project Manager Changelog

## [Search Bounces, Shared Bounces Folder, and Data Export & Import] - {PR_MERGE_DATE}

Two new commands: Search Bounces finds any bounce across all your projects, and Export Data / Import Data back up your tags and collections. You can now also keep bounces from every project in one Shared Bounces Folder, and start with `#` in Search Projects to combine filters, like `# rnb 2025 am 120-128`.

### ✨ New

- **Search Bounces**: A new command that lists the bounces of every project in one place. Search by file or project name, and group by created date or source
- **Export Data / Import Data**: Two new commands that save your tags, collections, track numbers, roles, and bounce sources to a `.json` file and restore them later. Before importing, you see what will change, and your current data is backed up
- **Shared Bounces Folder**: Keep bounces from every project in one folder. Files are matched to projects by name, and files that match no project are listed in Unmatched Bounces (⌘⇧B), where you can assign them to a project
- **Combined Search**: Start with `#` to require every word to match. Search by name, stage, genre, collection, created date, key (`am`, `c#m`), BPM or BPM range (`120`, `90-100`, including half and double time), and time signature (`6/8`)
- **New Live Set from Template** (⌘⌥⌃N): Pick a template from your Templates Folder and open it as a new Set
- **Open Latest Set** (⌘O): Opens the project's most recently modified Set
- **Edit Lyrics** (⌘⌥L): Edit lyrics in Raycast, just like Edit Note
- **Aliases**: Give stages, genres, and roles other names to search by, such as `dnb` for Drum & Bass
- **Year Filter**: Filter Search Projects by created year
- **Key and BPM in Detail**: The Detail view shows the latest Set's key and BPM

### 💎 Improvements

- **Search**: The search bar now also matches stage, genre, collection, created year and month, and the latest Set's key. Case, spaces, punctuation, accents, and full-width characters are ignored, so `hiphop` finds Hip-Hop and `rnb` finds R&B
- **Search Projects**: Opens faster, showing your last list right away while it checks for changes in the background
- **Queue Collection in Player**: Now queues only the Tracklist and skips Unsorted tracks
- **External Bounces**: If a linked file is renamed in place or moved into your Shared Bounces Folder, it's re-linked automatically when there's a single match
- **Playback**: The playing toast now shows just the song name and progress

### 🐞 Fixes

- **Edit Info**: Fixed existing roles showing as None

## [Initial Version] - 2026-11-07

- Search, sort, group, and pin your Ableton Live projects, with Detail and Overview views and Stage / Genre filters
- View the Live Sets in each project with key, BPM, and time signature read from the `.als` file; rename, duplicate, or move them to Trash
- Play the latest bounce from Raycast, with pause, seek, and restart; playback keeps going after the Raycast window closes
- Browse bounces with Quick Look, including bounce folders and files stored outside the project
- Edit Info: rename a project, set its stage, genres, and collections; duplicate a project
- Manage Tags: create, reorder, and recolor stages, genres, and track roles, and assign a stage or genre to many projects at once
- Markdown notes and lyrics in each project folder or a folder of your choice (e.g. an Obsidian vault), with templates supporting `{{title}}`, `{{date}}`, and `{{time}}` and custom date formats; changes from other editors show up right away
- Collections: arrange a tracklist, assign track roles, see a relative energy score from each track's latest bounce, and queue the whole collection in your player as an `.m3u` playlist
- Picks up projects renamed or deleted in Finder, guards against mass deletion when a drive is unplugged, and restores tags and track data when a project is put back from the Trash within 30 days
