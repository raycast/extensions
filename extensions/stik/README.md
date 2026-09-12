# Stik

Quick capture and browse your [Stik](https://stik.ink) notes from Raycast. Create, search, organize, and manage plain‑Markdown notes stored locally on your Mac.

Notes are saved as ordinary `.md` files in your Stik folder (`~/Documents/Stik/` by default), so everything you capture here is fully compatible with the Stik app, iCloud Drive, Obsidian, git, or any text editor. Nothing is locked in a proprietary database.

## Commands

- **Quick Capture** — Create a new note with a title, Markdown body, and optional folder, saved instantly to your Stik folder.
- **Search Notes** — Full‑text search across every note.
- **Browse Notes** — Browse all notes grouped by folder, with a folder filter.
- **Open Recent** — Jump to your 10 most recently modified notes.

From any note you can view it, open it in your editor, copy its contents, move it between folders, or delete it.

## Setup

Set **Notes Directory** in the command preferences if your Stik notes live somewhere other than `~/Documents/Stik/` (for example an iCloud Drive path). The folder is created automatically if it doesn't exist.

## How it works with Stik

Files are written in the same format as the Stik app — `YYYYMMDD-HHMMSS-slug-uuid.md`, plain Markdown with the title as the first line (no frontmatter) — so notes captured in Raycast appear seamlessly in Stik and vice versa.
