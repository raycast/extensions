# Folder Routes

Copy or move files quickly using reusable destinations, quick commands, and bulk CSV and JSON destination management. Folder Routes is a local-first macOS Raycast extension for keeping a reusable destination library.

## Commands

- **Copy Selected Files To** shows destinations with copy enabled.
- **Move Selected Files To** shows destinations with move enabled.
- **Manage Destinations** adds, edits, pins, deletes, imports, exports, or reveals destinations.
- **Add Destinations** immediately adds selected Finder folders to the destination library and CSV source of truth.
- **Overwrite Destinations from CSV** replaces the saved destination library from the CSV source of truth.

Destination names, absolute paths, and aliases are searchable. Pinned destinations appear first.

## Setup

Requirements:

- macOS with Raycast installed
- Node.js and npm for extension development

Install and run:

```bash
npm install
npm run dev
```

Raycast imports the development extension and exposes its five commands. Select files or folders in Finder before opening a copy or move command.

## Initial Setup

The quickest way to create a curated destination list is **Add Destinations**:

1. Select one or more folders in Finder.
2. Run **Add Destinations** and press Enter once.

On the first change, Folder Routes creates `~/Library/Application Support/Folder Routes/destinations.csv` automatically. New Finder folders initially appear for Copy and Move, but are not pinned. Change the CSV location or these defaults later in **Configure Extension**.

The command adds exactly the selected folders. It skips files, repeated selections, and folders already in the list. New destinations use the folder name for their display name and initial keyword. If names or IDs collide, the extension adds a numeric suffix to keep every saved destination distinct. Add and Manage actions update the configured CSV first and then Raycast LocalStorage.

Alternatively, edit the CSV manually and run **Overwrite Destinations from CSV**. This replaces the saved local list from that CSV.

## File Conflicts

The extension preference **File Conflicts** controls existing destination items:

- **Prompt** asks before replacing each conflict; declining skips that item.
- **Skip** leaves the existing destination item unchanged.
- **Overwrite** replaces the destination item using a temporary backup and rollback attempt.
- **Keep Both** creates names such as `report copy.pdf` or `report copy 2.pdf`.

Moves first try a filesystem rename. Cross-volume moves fall back to copy-then-delete, and the source is removed only after the copy succeeds.

## Destination Data

Each destination has a stable ID, display name, absolute directory path, aliases, copy/move enablement, and pinned state. The collection is stored as a versioned JSON payload in Raycast LocalStorage. Storage is accessed only through the repository service so future schema migrations can be added centrally.

## Bulk Import

Open **Manage Destinations** and choose **Import Destinations**. The extension parses and validates the complete file before saving anything. The preview reports valid, invalid, duplicate, and missing-folder entries.

At import time choose one strategy:

- **Skip Duplicates** (safest default)
- **Replace Matching Destinations**

Invalid entries, duplicate entries that are skipped, and paths that are not existing directories are never imported. Replace removes matching saved destinations before adding the validated import. The final collection is written to the configured CSV and LocalStorage only after confirmation.

## Manual CSV Synchronization

Use **Overwrite Destinations from CSV** after editing the CSV outside Folder Routes. Because it replaces the complete saved list, make manual CSV edits before the next synchronization if that CSV is your source of truth.

By default, the CSV is created at `~/Library/Application Support/Folder Routes/destinations.csv`. In **Configure Extension**, you can select a different **Destinations CSV** file. Each synchronization reads that selected file—or the default one when none is selected—and replaces the complete saved destination collection only when:

- every entry has a stable, non-empty `id`;
- names, paths, and IDs are unique;
- every destination path is absolute;
- every destination folder exists;
- all CSV fields and booleans are valid.

If validation fails, the previously saved destinations remain unchanged. A CSV containing only its valid header clears the saved destination library. Manual changes made through **Manage Destinations** are overwritten the next time synchronization succeeds.

### CSV

Required headers are `name` and `path`. Supported headers are:

```csv
id,name,path,keywords,copy,move,pinned
invoices,Invoices,/Users/example/Documents/Invoices,"invoice;billing",true,true,false
archive,Archive,/Users/example/Documents/Archive,"archive;old",true,true,true
```

`id` is optional for one-time import but required for source-of-truth synchronization. `keywords` uses semicolons. Boolean fields accept `true` or `false`; omitted copy/move values default to `true`, and omitted pinned values default to `false`. Standard quoted CSV fields, escaped quotes, commas, CRLF, and quoted newlines are supported.

[`destinations.example.csv`](destinations.example.csv) is an anonymized template for manual setup. The local `destinations.csv` file used during development is ignored and must not be published.

### JSON

The root must be an array. `id` is optional.

```json
[
  {
    "name": "Invoices",
    "path": "/Users/example/Documents/Invoices",
    "keywords": ["invoice", "billing"],
    "copy": true,
    "move": true,
    "pinned": false
  }
]
```

## Export

**Export All Destinations** writes a re-importable JSON array to `~/Downloads` (or the home directory if Downloads is unavailable). Existing exports are never overwritten; a “copy” suffix is added instead.

## Privacy

The extension has no analytics, telemetry, accounts, or network requests. Destination metadata is stored in Raycast LocalStorage. File operations and imports run locally on the Mac.

## Limitations

- Finder must provide the active selection to Raycast; launch errors are shown when it cannot.
- Prompt conflict handling provides Replace or Skip for each conflict. Choose the Keep Both preference for automatic alternate names.
- Overwrite rollback is best-effort if the filesystem itself fails during both the transfer and restoration.
- Do not ship a personal destinations CSV with the extension. Each user receives a new local CSV on first use.

## Development

```bash
npm run format
npm test
npm run lint
npm run build
```

See `AGENTS.md` for repository conventions and verification requirements.
