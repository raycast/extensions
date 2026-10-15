# Goose Mark for Raycast

Goose Mark is the Raycast companion for the Goose Mark uTools plugin. Both use the same shared data folder, including bookmarks, categories, icons, and synchronization state. Browse a visual grid, organize each bookmark in multiple locations within two-level categories, and open saved links or parameterized URL templates.

Add, edit, and delete bookmarks; use favorites and recent items; and transfer portable data folders with icons. Library changes are recorded as events, with explicit conflict resolution when concurrent versions disagree. A shared data folder is optional.

Only **Goose Mark** is registered as a command. Add bookmarks and open Settings & Data from its action panel. The source for the data layer and its self-checks is in `src/repository.ts`, `src/import-export.ts`, `tests/core.test.ts`, and `tests/shared-json.test.ts`. A successful build does not verify behavior inside Raycast or synchronization across Macs.

## Develop and install locally

Node.js 22.14+ and npm 7+ are expected by the checked-in `package-lock.json`.

```sh
npm install          # Install dependencies using the lockfile
npm run dev          # ray develop: load the development extension in Raycast
npm run build        # ray build: distribution build, including type checking
npm test             # node:test and assert against synthetic directories
npm run typecheck    # tsc --noEmit
```

To import the source extension, use **Raycast → Import Extension** (a Raycast account is required) and select this directory. No verified free-plan extension-count limit is asserted here.

| Command    | What it does                                                                                                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Goose Mark | Grid search over titles, URLs, descriptions, and tags, including Chinese pinyin and initials; filter all/favorites/recent/trash/categories; add bookmarks and open Settings & Data for categories, data transfer, conflicts, and directory options. |

The extension interface is in English; bookmarks can still contain Chinese text.

The command opens as a list. Press **⌘L** to switch between the list and the icon grid. List icons skip embedded images larger than about 9 KB and all ICO data, because decoding those images while changing groups can freeze Raycast. Bookmark data is unchanged.

## Local event library and shared data folder

The local event library is the primary store for edits and history. The optional shared data folder contains portable `bookmarks.json` and `assets/icons/` files for cross-device transfer and synchronization; keep those files together. Settings remain local to Raycast and are not stored in the portable folder. Use **Settings & Data → Shared Data Folder** to open an existing folder, create one from the verified local library, migrate a compatible legacy JSON source, or disconnect while retaining local events. Opening a folder previews and confirms authoritative replacement. A legacy JSON value in the retained `dataFile` preference is read-only and supports migration only. Folder exports are portable bookmark data and require a verified, conflict-free library.

A missing or invalid selected data source shows a recovery view rather than an empty bookmark grid. The local event library remains available for recovery management.

- Default: `environment.supportPath/marks-library`, created on first use with `0700` permissions. Events live in `events/`; local icon attachments live in `icons/`.
- Custom: **Dedicated Data Directory (Advanced)** selects an **existing**, dedicated folder for the local event library. It must be empty or contain only `events` and `icons` (Finder `.DS_Store` is tolerated). This is local event storage, not the cross-device shared data folder.
- Use **Goose Mark → Settings & Data → Validate Custom Directory** for a read-only check, then copy the path into extension preferences yourself. Raycast does not expose a preference-writing API to this extension.
- **Changing this setting does not move, copy, delete, or merge the old library.** It remains where it was; export and import manually if needed.
- Only ordinary files and directories are accepted. Symlinks or other non-ordinary entries in `events/`, event files, or temporary files block writes. `.DS_Store` at the root or in `events/` is ignored without reading it; other unknown files still trigger read-only protection.

### iCloud Drive considerations

A dedicated directory can be placed under `~/Library/Mobile Documents/com~apple~CloudDocs/…`; confirm in Finder that it really is in iCloud Drive. **File synchronization is not a database or a backup**: there is no promised latency bound, conflict-free concurrent writing, or zero data loss. Files may be placeholders, stale, removed from local storage, or unavailable offline; unreadable files block writes instead of being treated as an empty library. Deletions may propagate to other devices on the same account, and available storage may be shared with other iCloud uses. Absolute paths may need to be selected again on another Mac; the directory preference is not synced by this extension. A local event write does not prove upload or visibility on another device. No sync-progress UI is provided; export backups regularly.

### Optional JSON compatibility

Import JSON accepts this extension's backups and Goose Mark (uTools) exports with `{groups, bookmarks, settings}`; `settings` is optional and ignored by the Raycast library. Legacy application databases are not read directly.

To import a Goose export:

1. Export JSON with `{groups, bookmarks}` and optional `settings` from the source application.
2. Open **Goose Mark → Settings & Data → Import JSON** and choose the file; selecting it opens the preview automatically.
3. Read the preview and warnings. Embedded icons are saved under the new library's `icons/`; remote and text icons are preserved. An imported legacy `file` icon path is **never read** and gets a local placeholder. Import does not wait for network requests; use **Refresh Icon** afterward to fetch a site icon.
4. For different contents with the same ID, inspect the full difference (URL, deletion, locations, description, tags, and categories) and choose **Keep Local** or **Use Imported**. Different IDs with the same URL produce a warning, not an automatic merge.
5. Apply the import from the preview; the command returns to the bookmark grid with the imported data immediately. Export a backup of the target library first; exports refuse to overwrite an existing destination.

Default and trash groups map through fixed exported IDs (`g-default/sg-default` and `g-trash/sg-trash`). `prevLocations`, favorites (`pinned`), tags, timestamps, and aggregate visit counts are preserved where applicable. **For a same-ID manual import, local visit base, historical visit events, and `lastUsed` are retained; imported usage does not replace them.** Authoritative shared-folder synchronization instead accepts the source's total `visits` and `lastUsed`.

## Event format and limits

- Every write is an immutable `events/<UUID>.json` event: `{schemaVersion, eventId, occurredAt, mutations[], visits[]}`. An entity version is identified by `eventId`; `baseHeads` names all heads observed by the writer. Optional bookmark mutation fields `coveredVisits` identify visit events already included in an authoritative total, preventing double counting; `removed` records permanent source deletion while retaining its version history.
- Publication does not overwrite: create a temporary file with `wx`, fsync, link it to the final name (`EEXIST` rejects), then remove the temporary name. It does not use an overwriting rename. If cleanup fails after publication, it rereads the final event to verify it and reports a warning instead of automatically retrying.
- Limits: 10 MiB per event and JSON document, 10,000 events, 100 MiB expanded folder data, and 100 MiB total. Exceeding a limit blocks writing; no implicit cleanup occurs.
- Ordinary writes stop while multiple heads or structural conflicts remain. Resolve **all** conflicts in Settings & Data.
- Corruption, missing parents, dependency cycles, unknown schemas or final files, or an unavailable directory result in a `blocked` state. The command reports the issue read-only rather than saving an empty library.

## JSON and shared-folder boundaries

Goose source `settings` are ignored on import and preserved unchanged in shared-folder writes; they never enter Raycast preferences, events, or backups. Unknown declared versions and secrets outside `settings`, such as `apiKey` or `token`, are rejected without echoing values. Backup export builds an allowlisted payload from verified, conflict-free entities and excludes source settings, directory paths, and runtime settings. File icons are embedded with format, location, and size checks. Folder export writes only to a selected destination and never overwrites an existing folder. Each JSON document has a 10 MiB cap; folder imports allow up to 100 MiB expanded data.

Settings & Data can connect an existing portable data folder as the authoritative shared source or create one from the current library. Connecting previews differences and confirms replacement before applying the source; back up local changes first. Shared writes retain unchanged URL spelling, icons and their matching metadata, `group.orderIndex`, manual subcategory member order, bookmark array order, and `prevLocations`. External total `visits` and `lastUsed` replace local totals without recounting covered visit events; bookmarks permanently removed from the source stay removed during later writes. The local synchronization baseline compares the portable library payload, separately from the source envelope containing `settings.json`.

The original event directory is retained. The shared folder contains portable bookmark data and icons; its `settings.json` is preserved by shared writes and never imported into Raycast preferences. Missing folders or conflicting baselines block synchronization and writes; unrefreshed external changes or existing writer locks block writes. External changes are polled while the main view is open; **iCloud delivery, cross-device locking, and automatic conflict resolution are not guaranteed**. If local changes are saved but source publication or connection cannot be confirmed, syncing pauses until reconnection or disconnection. Keep the shared folder in a dedicated location and avoid concurrent edits across devices.

## Conflicts and recovery

Settings & Data lists every concurrent version of each entity, including tombstones, locations, visit base, and version ID. Choose **Keep This Version**, **Keep and Move to Trash**, or **Keep and Repair to Default Location** for each conflict. All conflicts must be decided in one application. The resolution uses all current heads; invalid category references reject the whole operation. Conflict resolution does not infer revival or deletion; authoritative source deletion follows the shared-folder rules above.

For damaged or conflicted event data, **Settings & Data → Back Up Local Event Library (Recovery)** copies the raw `events/` and `icons/` files into a new destination without parsing event JSON. This recovery copy is not a portable bookmark folder, excludes settings, and is never imported automatically. A partial failure leaves the destination in place and reports it as incomplete; it does not delete source data.

## Not implemented in this version

HTML/URL Wizard import, bulk actions, dead-link checks, page scraping, category ordering controls or dragging, copying descriptions, and moving a subcategory across parent categories or promoting it. The icon pipeline supports portable custom and remote icons, local files, and site favicons.

## Verification and publication status

The build and lint checks do not verify the Raycast UI, iCloud synchronization across Macs, or Store review. The source is licensed under MIT.
