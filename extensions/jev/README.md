# Jev for Raycast

Saved text checks, document filing, and browser bookmark search powered by TypeSafe Jev.

## Get started

This is an independently developed integration with [TypeSafe AI](https://typesafe.ai/). It does not require Raycast AI.

1. Get an API key from the [TypeSafe console](https://console.typesafe.ai/). See TypeSafe's [quick start](https://docs.typesafe.ai/introduction/quickstart).
2. In Raycast's Jev preferences, enter the key in **TypeSafe API Key**. Keep **Model** set to `jev-latest` unless TypeSafe provides another identifier.
3. Open **Run Preset**, choose a check, and review the input before running it.

Manual filing and keyword bookmark search work without an API key. Jev requests require a TypeSafe account with API access and may incur charges. Open **Actions → Set up Jev** from any main workflow to test the connection or find the setup screens.

## Commands

| Command            | Use                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------- |
| Run Preset         | Review selected or pasted text, run a saved check, and copy findings or JSON.          |
| Manage Presets     | Create, duplicate, edit, import, and export presets; create a Quicklink to a favorite. |
| File Documents     | Choose files, preview a suggested folder, confirm the move, and undo directly.         |
| Filing History     | Inspect moves, undo unchanged documents, and reconcile an interrupted move.            |
| Search Links       | Search selected browser bookmarks by keywords or explicitly by meaning.                |
| Backup and Restore | Export Jev settings, preview a backup, or restore a recovery copy.                     |

Document destinations and bookmark sources are managed inside their respective workflows. You can add an existing folder directly from File Documents; use **Actions → Manage Destinations** to edit it later. Search Links starts with **Choose Bookmark Sources** until you enable a profile.

## Presets

Five presets are included: Classify Feedback, Check Bug Report, Check Requirements, Categorize Content, and Score Clarity. Each can be duplicated and changed.

Questions support categories, yes/no checks, and ordered scoring rubrics. In the editor, enter category options or score levels one per line using `Label | Description`. Score levels run from low to high. Include an Other category where appropriate.

A Quicklink stores only the preset ID. It opens the input preview with that preset selected; it does not send text automatically. Inputs and results are held in the command's memory and are not saved to an evaluation history.

Yes/no probabilities between 0.2 and 0.8 are shown as uncertain. Category and score confidence below 0.7 is marked uncertain. These are initial display thresholds, not measured accuracy guarantees. Raw probabilities are available in result details.

## Document destinations

Choose real folders through the folder picker. Jev can suggest only a configured destination or no match. Folder descriptions guide the suggestion. You can always select a folder manually.

AI suggestions support UTF-8 text files and text-based PDFs up to 10 MB. The input preview shows at most 24,000 extracted characters and explicitly marks truncation. Scanned PDFs need OCR and are not supported for AI suggestions. Other regular files can still be filed manually.

Moves require confirmation, never overwrite an existing file, and are recorded before execution. Undo checks a SHA-256 digest and refuses to overwrite an occupied original path or undo a changed document. If a move is interrupted, **Reconcile Interrupted Move** checks both paths without modifying the files. Ambiguous cases keep both copies for manual inspection. Folders and symbolic links are not filed.

## Bookmarks and Quicklinks

Your browser owns your bookmarks. Jev reads them directly; there is no separate Save Link workflow or collection to maintain. Add, edit, move, and delete bookmarks in your browser. Reopen Search Links or use **Refresh Bookmarks** to read changes.

Supported sources on macOS are Chrome, Brave, Microsoft Edge, Vivaldi, and Chromium in their standard profile locations. Use **Search Links → Actions → Choose Bookmark Sources** to enable one or more profiles. No source is enabled automatically on a new installation. If macOS blocks access, Jev shows permission guidance; you decide whether to grant Raycast access. Folder selection includes subfolders; leaving it empty includes all folders in that profile. A deleted selected folder produces an error and does not silently widen the search. Safari, Firefox, browser beta variants, and custom profile locations are not currently supported.

Keyword search matches titles, URLs, folder names, and profile labels locally. The folder dropdown narrows results. **Search by Meaning** previews the number of bookmarks before sending the query, titles, URLs, and folder names to TypeSafe. It supports up to 300 bookmarks in the selected search scope, in batches of 30, with progress and cancellation. Page content is not fetched. Results are suggested matches, not verified answers.

Each result offers **Open in Browser**, **Copy URL**, and Raycast's native **Create Quicklink** action. Existing Quicklinks remain searchable in Raycast's root search and Search Quicklinks command. Raycast's public extension API does not expose a supported way to enumerate the user's Quicklinks, so Jev does not index them or read Raycast's private database.

Existing links from an earlier Jev version remain available as **Legacy Jev Links** and are retained in backups. Browser bookmarks are not copied into Jev backups; back them up through your browser.

## Data and privacy

TypeSafe processes explicit API requests under its applicable service terms. See the provider's [terms](https://typesafe.ai/legal/terms) and [privacy policy](https://typesafe.ai/legal/privacy-policy). This extension does not claim vendor endorsement or promise a particular data-retention policy.

Presets, destinations, bookmark source choices, legacy links, and filing records are saved in `jev-data.json` inside Raycast's extension support directory. Writes are serialized and use atomic replacement. Invalid existing data is never silently replaced with defaults. Use **Backup and Restore** to export the data. The API key stays in Raycast's password preference and is not included in exports. Automatic text capture skips common API-key and private-key formats. Requests also reject detected credentials or the configured TypeSafe key in input or questions. This is a limited safeguard, so review the preview before sending.

Text is sent to `https://api.typesafe.ai/v1/systemone` only when you choose a Jev action. Document suggestions include the displayed text and filename plus configured destination names and descriptions, not folder paths. Semantic search sends the displayed bookmark metadata, including folder names. No background scanning or automatic file moves occur.

Jev keeps the last ten automatic data snapshots. An explicit restore first saves an additional recovery copy, even if current data is corrupt. Restore replaces settings and legacy links while retaining readable current filing history; it never moves documents or changes browser bookmarks. Abandoned write locks recover automatically after their lease expires. Do not delete lock files manually. Local recovery copies are not protection against disk loss; export backups to another location for that.

## Development

`npm ci` installs dependencies. `npm run dev` imports the extension into local Raycast and starts development mode.

`npm run check` builds the extension, checks types, runs tests, and runs Raycast lint. Building writes to Raycast's local extension directory. The package lock pins the dependency graph.

Automated tests cover the TypeSafe contract, invalid responses, missing credentials, atomic data persistence, concurrent writers, file collisions, changed-file undo refusal, recovery, bookmark imports, and real PDF text extraction. A test transport is used only in tests. The product has no mock AI mode.

Tests use temporary files and synthetic fixtures. The recovery suite deliberately terminates its own test writer to verify abandoned-lock recovery.
