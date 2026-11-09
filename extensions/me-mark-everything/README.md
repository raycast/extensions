# Mark Everything

Search, save and edit bookmarks in your local ME library from Raycast.

This is the Raycast companion for [Mark Everything (ME)](https://github.com/Schnee013/mark-everything), a local bookmark manager. **Install and configure ME first:** [installation guide](https://github.com/Schnee013/mark-everything/blob/main/docs/INSTALL.md) and [releases](https://github.com/Schnee013/mark-everything/releases). The current prebuilt ME helper supports macOS on Apple Silicon.

Parts of the interface are adapted from the MIT-licensed Raindrop.io extension in `raycast/extensions`. This is an independent project, not an official Raindrop product or a Raindrop account integration. See [Third-party notices](THIRD-PARTY-NOTICES.md) for the pinned source, reused files, and adaptation boundaries.

## Setup

1. [Install and configure ME](https://github.com/Schnee013/mark-everything/blob/main/docs/INSTALL.md), bind a library in its browser manager, and ensure its local helper is running correctly.
2. Install this Raycast extension and open **Search Bookmarks** or **Save Bookmark**.
3. The extension reads ME's default `~/Library/Application Support/me-raindrop/helper-install.json`. To select another ME environment, set **Helper Discovery Record** to its complete configuration file. An invalid explicit path stops the connection; it never silently selects your default library. A recognized retired ME 0.2 installation is migrated with a notice.

macOS only. The helper must support protocol/schema 1 and the `query`, `get`, `execute`, `commandStatus`, `status`, `openManager` and `managerStatus` capabilities. A missing or incompatible helper must be repaired through ME. The extension does not install the main application or manage sync credentials.

## Save bookmarks

Save one bookmark or a batch of up to **10 bookmarks per submission**. This is a per-submission limit, not the total capacity of your library. Start with one URL and use **Actions → Add Another URL** to add more. Each row has its own title; note, collection and tags apply to every row. Use **Actions → Remove URL** to remove a row. Each field accepts exactly one HTTP(S) URL, including commas and semicolons inside that URL. A bare hostname receives `https://`.

The form checks for existing bookmarks while you type and again before submission. Matches are marked in place; **View Existing Bookmarks** opens them without losing the form. Any existing or same-batch duplicate stops the entire batch. Nothing is merged or overwritten. Blank or invalid rows must be corrected or removed.

Duplicate identity ignores scheme, `www.`, trailing slashes, plain section anchors and campaign parameters. Meaningful query parameters and hash routes remain distinct. The scan checks at most 1,000 active bookmarks. An incomplete scan or a revision change reports **cannot confirm duplicates** and blocks the write; use ME for larger libraries. This bounded scan preserves raw/encoded URL equivalence without a separate index.

When launched from Chrome, Edge or Arc, Save can prefill the current page's URL and title. macOS may request Automation access. You can paste a URL if capture fails. Untouched fields may be prefilled; your edits are retained. Ordinary unsubmitted input is not saved across command exits.

## Search and edit

Search uses ME's local search, including full pinyin and initials when provided by the installed helper. Indexing, import and synchronization remain ME responsibilities. The extension does not keep a second search index.

Search remembers one collection filter per library. A same-query refresh failure keeps the previous results with a visible warning. A different query does not display unrelated previous results. Refresh reloads both bookmarks and collections.

**Edit in Raycast** edits title, URL, note, description, favorite, collection and existing tags. It writes changed fields against the versions displayed when the form opened. Conflicts and structural problems are reviewed in ME. **Move to Trash** asks for confirmation and changes only the bookmark's life state; restore and permanent deletion stay in ME.

**Open in ME Manager** requires the browser profile where ME is installed. Chrome and Edge use the helper's confirmation. Arc does not accept externally opened extension pages; the extension explains the limitation instead of claiming success.

## Pending submissions

Before executing a write, the extension stores the exact command, library and stage locally. If the result is unknown, use **Check Result**. If ME has no record of the command, you can confirm **Retry Original Submission** or cancel and keep it pending. The retry keeps the original ID, values and versions; newer changes, including Trash changes, may produce conflicts. A definitive core rejection releases the pending slot without inventing a new write.

If ME already committed the command, the extension verifies the original command and reads the result. A committed stage already saved locally requires only readback. A command still recovering dependencies remains pending. A collision or corrupt record is retained for support; there is no automatic discard or background retry queue.

“Saved locally”, “saved but needs review” and “saved but readback failed” are distinct outcomes. Cloud sync status does not reverse a local commit.

## Shortcuts

Use the **Shortcut:** preferences in Raycast settings, then reopen the command. Enter combinations such as `cmd+e` or `ctrl+shift+x`; `none` disables an additional shortcut. Invalid, reserved or conflicting combinations are reported. Raycast's primary/secondary action keys remain available.

Defaults: edit `cmd+e`, details `cmd+shift+d`, Trash `ctrl+x`, add URL `ctrl+shift+a`, remove URL submenu `ctrl+shift+r`. Other additional shortcuts are unset.

## Privacy

Bookmark operations use the installed ME helper over local stdio. This extension does not read WebDAV credentials or upload bookmarks itself. The main ME application owns synchronization.

Website icons use the favicon provider selected by Raycast (Raycast by default, or Google/DuckDuckGo when configured). Requests contain the website hostname, not the full bookmark URL or note. When Raycast disables favicons or selects Apple’s native provider, the extension uses a local fallback icon. Collection icons are bundled locally. Remote images in the Markdown detail content, including notes and descriptions, may request their full image URLs from the respective hosts. Notes retain Markdown formatting. These image requests mean the UI is not strictly offline.

Raycast LocalStorage holds pending command contents until they are confirmed and cleared, plus the last collection filter per library. Ordinary unsubmitted drafts are not persisted.

## Development

Use Node.js 22.22.2 or later. Run `npm ci`, `npm run build`, `npm run lint` and `npm run bundle`. Build writes to `dist`; bundle writes to `releases`. `npm run dev` imports the extension into Raycast for local development. Use this repository’s source for review and submission. Do not publish private evidence, local installation notes or personal configuration; these are excluded by the project’s Git ignore rules.

`src/core-api.d.ts` is an exact distribution snapshot of the ME-owned protocol, with provenance and hash in `docs/protocol-source.json`. It is not a separate protocol implementation. Refresh it from ME's authoritative `docs/api-v1.d.ts` and update that hash together; do not hand-edit the contract. A clean extension build needs no checkout of ME.

Tests that execute ME require either `ME_INSTALLED_DISCOVERY` pointing to an installed helper record or `ME_CORE_HOST` pointing to ME's source `helper/host.py`. For source tests, `ME_TEST_PYTHON` optionally selects the Python environment. `npm test` uses fresh temporary configs and libraries and removes them afterwards; it does not rebind the daily library. `scripts/duplicate-check.ts` and `scripts/installed-check.ts` use the same isolation fixture.

The reused Raycast/Raindrop UI and its pinned source are documented in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). The full MIT notice is included in the runtime assets.

## Support and license

Report extension problems and feature requests through [GitHub Issues](https://github.com/Schnee013/mark-everything-raycast/issues). This project is published and maintained by [Schnee013](https://github.com/Schnee013); the Raycast author handle is `roy`.

Licensed under [MIT](LICENSE). Adapted upstream code retains its original copyright and license in [assets/THIRD-PARTY-NOTICES.txt](assets/THIRD-PARTY-NOTICES.txt). ME’s browser manager, helper executable, database, sync engine, and search index are separate from this repository.

Collection icons are bundled for offline use: 199 monochrome Raindrop SVGs and 32 color Twemoji SVGs. Change them in the ME manager; the Raycast companion displays the same choice. See [third-party notices](THIRD-PARTY-NOTICES.md) for the separate MIT and CC BY 4.0 attribution.
