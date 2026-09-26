# Goose Mark for Raycast

A local-first bookmark extension with add/edit/delete, two-level categories and multiple locations, favorites and recent items, JSON import/export, explicit conflict resolution, and optional bring-your-own-key AI metadata suggestions.

Only **Search Marks** is registered as a command. Add bookmarks and open Settings & Data from its action panel. The source for the data layer and its self-checks is in `src/repository.ts`, `src/import-export.ts`, `src/ai.ts`, and `tests/core.test.ts`. A successful build does not verify behavior inside Raycast or synchronization across Macs.

## Develop and install locally

Node.js 22.14+ and npm 7+ are expected by the checked-in `package-lock.json`.

```sh
npm install          # Install dependencies using the lockfile
npm run dev          # ray develop: load the development extension in Raycast
npm run build        # ray build: distribution build, including type checking
npm test             # node:test and assert against synthetic directories
npm run typecheck    # tsc --noEmit
npm run lint:code    # ESLint and Prettier check
npm run lint         # Raycast lint; its result is not implied by a build
```

To import the source extension, use **Raycast → Import Extension** (a Raycast account is required) and select this directory. No verified free-plan extension-count limit is asserted here.

| Command | What it does |
| --- | --- |
| Search Marks | Grid search over titles, URLs, descriptions, and tags; filter all/favorites/recent/trash/categories; add bookmarks and open Settings & Data for categories, JSON transfer, conflicts, and directory options. |

The extension defaults to English and offers Simplified Chinese in its language preference.

## Local data directory

- Default: `environment.supportPath/marks-library`, created on first use with `0700` permissions. Events live in `events/`.
- Custom: enter an **existing**, dedicated directory in extension preferences. It must be empty or contain only `events` (Finder `.DS_Store` is tolerated). The extension does not choose a location for you.
- Use **Search Marks → Settings & Data → Validate Custom Directory** for a read-only check, then copy the path into extension preferences yourself. Raycast does not expose a preference-writing API to this extension.
- **Changing this setting does not move, copy, delete, or merge the old library.** It remains where it was; export and import manually if needed.
- Only ordinary files and directories are accepted. Symlinks or other non-ordinary entries in `events/`, event files, or temporary files block writes. `.DS_Store` at the root or in `events/` is ignored without reading it; other unknown files still trigger read-only protection.

### iCloud Drive considerations

A dedicated directory can be placed under `~/Library/Mobile Documents/com~apple~CloudDocs/…`; confirm in Finder that it really is in iCloud Drive. **File synchronization is not a database or a backup**: there is no promised latency bound, conflict-free concurrent writing, or zero data loss. Files may be placeholders, stale, removed from local storage, or unavailable offline; unreadable files block writes instead of being treated as an empty library. Deletions may propagate to other devices on the same account, and available storage may be shared with other iCloud uses. Absolute paths may need to be selected again on another Mac; the directory preference is not synced by this extension. A local event write does not prove upload or visibility on another device. No sync-progress UI is provided; export backups regularly.

### Migrate from goose-mark (uTools)

The old library is a uTools database. This extension does not read it or the original project's repository.

1. Export JSON with `{groups, bookmarks}` from the old goose-mark.
2. Open **Search Marks → Settings & Data → Import JSON** and choose the file.
3. Read the preview and warnings. Embedded icons are saved under the new library's `icons/`; an imported legacy `file` icon path is **never read** and a site favicon is attempted instead. Missing IDs and timestamps are generated or defaulted as indicated.
4. For different contents with the same ID, inspect the full difference (URL, deletion, locations, description, tags, and categories) and choose **Keep Local** or **Use Imported**. Different IDs with the same URL produce a warning, not an automatic merge.
5. Apply the import from the preview. Export a backup of the target library first; exports refuse to overwrite an existing destination.

Default and trash groups map through fixed exported IDs (`g-default/sg-default` and `g-trash/sg-trash`). `prevLocations`, favorites (`pinned`), tags, timestamps, and aggregate visit counts are preserved where applicable. **For a same-ID merge, local visit base, historical visit events, and `lastUsed` are retained; imported usage does not replace them.**

## Event format and limits

- Every write is an immutable `events/<UUID>.json` event: `{schemaVersion, eventId, occurredAt, mutations[], visits[]}`. An entity version is identified by `eventId`; `baseHeads` names all heads observed by the writer.
- Publication does not overwrite: create a temporary file with `wx`, fsync, link it to the final name (`EEXIST` rejects), then remove the temporary name. It does not use an overwriting rename. If cleanup fails after publication, it rereads the final event to verify it and reports a warning instead of automatically retrying.
- Initial hard limits: 10 MiB per event/import, 10,000 events, and 100 MiB total. Exceeding a limit blocks writing; no implicit cleanup occurs.
- Ordinary writes stop while multiple heads or structural conflicts remain. Resolve **all** conflicts in Settings & Data.
- Corruption, missing parents, dependency cycles, unknown schemas or final files, or an unavailable directory result in a `blocked` state. The command reports the issue read-only rather than saving an empty library.

## JSON and shared-file boundaries

Import accepts this extension's JSON or legacy goose-mark `{groups, bookmarks}`. Unknown declared versions and fields such as `settings`, `apiKey`, or `token` are rejected without echoing their values. Export builds an allowlisted payload from verified, conflict-free entities; it excludes AI configuration, the directory path, and runtime settings. File icons are embedded in a portable backup, with format, location, and size checks. Export writes only to a destination you explicitly select and never overwrites an existing file. The complete JSON has a 10 MiB cap.

Settings & Data can connect an existing JSON file as the authoritative shared source or create a new JSON file from the current library. Connecting previews differences and asks for confirmation before applying the file to the local event library; back up local changes first. The original event directory is not deleted. The shared source must be an ordinary file no larger than 10 MiB. Missing, changed, or conflicting source/baseline states block synchronization or writes rather than silently treating the file as empty. An external file is polled while the main view is open; **this is not a guarantee of iCloud delivery, cross-device locking, or automatic conflict resolution**. A local transaction can succeed while publication to the shared file fails; heed the warning and make a backup before reconnecting. Keep the shared JSON in a dedicated location and do not edit it concurrently on multiple devices.

## Optional AI (direct BYOK)

- Protocols: `openai-responses` (`/responses`), `openai-compatible` (`/chat/completions`), and `anthropic` (`/messages`). Each has a separate password preference; base URL and model are also configured in extension preferences.
- Only fields selected in the form (title, URL, description, tags) are sent, after a confirmation showing the protocol, endpoint, model, and field list. Suggestions appear as plain-text before/after values; applying them fills the form, and saving still requires form submission.
- Categories, visits, and directory paths are not sent. The API key is sent only as an authorization header to the configured service, not put in a prompt, log, bookmark library, or export. Raycast AI (`AI.ask`) is not used.
- HTTPS is required except for loopback HTTP. Redirects are rejected; timeout is 20 seconds and response limit 1 MiB. Responses falls back to Chat on 405/501 from the same service only; it does not retry or fall back on 401, 429, or network errors.
- A Raycast password preference is an input control, **not verified macOS Keychain protection**. Decide whether to provide a key according to your threat model. Missing keys, cancellation, timeouts, and provider errors do not prevent ordinary bookmark use.

## Conflicts and recovery

Settings & Data lists every concurrent version of each entity, including tombstones, locations, visit base, and version ID. Choose **Keep This Version**, **Keep and Move to Trash**, or **Keep and Repair to Default Location** for each conflict. All conflicts must be decided in one application. The resolution uses all current heads; invalid category references reject the whole operation. There is no automatic revival or deletion.

## Not implemented in this version

HTML/URL Wizard import, bulk actions, pinyin search, dead-link checks, page scraping, category ordering or dragging, emptying trash, copying descriptions, and moving a subcategory across parent categories or promoting it. The icon pipeline uses local files and site favicons rather than the old uTools attachment API.

## Verification and publication status

The build and lint checks do not verify the Raycast UI, real AI requests, iCloud synchronization across Macs, or Store review. The source is licensed under MIT.
