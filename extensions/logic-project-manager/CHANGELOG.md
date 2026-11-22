# Logic Project Manager Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search, sort, group, and pin your Logic Pro projects, with Detail and Overview views and Stage, Genre, and Year filters
- Start with `#` in Search Projects to combine filters: name, stage, genre, collection, created date, key, BPM or BPM range, and time signature
- View each project's Alternatives with their window thumbnail, key, BPM, and time signature; open one in Logic Pro, set it as active, rename, duplicate, or move it to the Trash
- For a project saved in a folder, View Project Files lists its `.logicx` files (e.g. versions saved with Save As); the most recently saved one is used for key, BPM, and ⌘O
- Choose which Logic Pro opens your projects: Logic Pro or Logic Pro (Creator Studio)
- Play the latest bounce from Raycast, with pause, seek, and restart; playback keeps going after the Raycast window closes
- Gather bounces from each project, a Shared Bounces Folder matched by name, and external folders or files; Search Bounces finds any bounce across all your projects
- Edit Info: rename a project, set its stage, genres, and collections; duplicate a project
- Manage Tags: create, reorder, and recolor stages, genres, and track roles, give them aliases to search by, and assign a stage or genre to many projects at once
- Markdown notes and lyrics in each project folder or a folder of your choice (e.g. an Obsidian vault), with templates supporting `{{title}}`, `{{date}}`, and `{{time}}` and custom date formats; edit them in Raycast, and changes from other editors show up right away
- Collections: arrange a tracklist, assign track roles, see a relative energy score from each track's latest bounce, and queue the Tracklist in your player as an `.m3u` playlist
- Export Data and Import Data back up your tags, collections, and other extension data to a `.json` file and restore them
- Picks up projects renamed or deleted in Finder, guards against mass deletion when a drive is unplugged, and restores tags and track data when a project is put back from the Trash within 30 days
