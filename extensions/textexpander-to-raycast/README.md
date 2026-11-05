# TextExpander to Raycast

Review, edit, and combine TextExpander snippets before importing them into Raycast. Inspired by [Ahmad Awais's textexpander-to-raycast](https://github.com/ahmadawais/textexpander-to-raycast).

## Convert your snippets

1. Open **Convert TextExpander Snippets** in Raycast.
2. Choose **Find Local TextExpander Settings**, or **Choose Files or Settings Bundles** to select one or more exports. Repeated paths and symlinks to the same source are read once.
3. Optionally choose a JSON file from Raycast's **Export Snippets** command to check existing keyword conflicts.
4. Choose whether to prefix snippet names with their group and whether to convert supported macros, then select **Preview Snippets**.
5. Search names, keywords, groups, or content. Use the review-status dropdown and **Filter by Group** in the action panel to narrow the list. Press Return to include or exclude a snippet. **Include Matching Snippets** and **Exclude Matching Snippets** apply to the current search and filters.
6. Press **⌘E** to edit a name, keyword, or text. Use **View Original and Converted Snippet** to compare, **Restore Source Snippet** to restore source content, or **Reset Edits to Initial Conversion** to undo manual edits. **Rename Group** updates the group and existing `[Group]` prefixes.
7. Use **Resolve Keyword Conflict** to compare matching snippets, keep one incoming snippet, keep the existing snippets, or edit a keyword. Conflicts recalculate as the selection changes.
8. Choose **Export Selected Snippets** from the action panel to export the selected snippets across all groups. Choose one JSON file or separate files per group, with an optional migration report. A report can also be exported on its own, including when no snippets are selected.
9. Run Raycast's **Import Snippets** command and select a snippet JSON file. Import each group file separately when using a group export. Migration reports are for review and are not importable snippet files.

No data is uploaded. Source files and your live Raycast library are never modified. Files use private permissions, and existing output files and folders are never overwritten. If an export fails, newly created output is removed so the same filename can be retried.

## Supported sources

| Source                                 | How to use it                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| TextExpander web CSV export            | Export a group from TextExpander's Import/Export page, then choose the CSV file. The filename becomes its group name. |
| Legacy `Settings.textexpander`         | Auto-detected in `~/Library/Application Support/TextExpander/`. Reads `snippetsTE2` and `groupsTE2`.                  |
| `.textexpander` or XML group export    | Choose a property list containing `name` and `snippetPlists`, or `groupInfo.groupName` and `snippetsTE2`.             |
| `Settings.textexpandersettings` bundle | Auto-detected at the same location, or choose a bundle yourself. Reads `group*.xml` files directly inside it.         |

Auto-detection checks the bundle before the legacy file. It does not search custom Dropbox/iCloud locations or newer TextExpander databases. Choose those sources manually or use CSV exports. Unzip compressed exports first.

CSV accepts `abbreviation`, `snippet`, and optional `label` headers, in any order. Headerless files must contain two or three columns in that order. Quoted commas, double quotes, Unicode, and multiline text are supported. Repeated column names and incomplete recognized headers are rejected.

Try [Email.csv](examples/Email.csv) alone, or combine it with [Work.csv](examples/Work.csv) to review a keyword conflict. [raycast-reference.json](examples/raycast-reference.json) provides safe comparison data. The [sample JSON](examples/converted-example.json) contains Email's greeting and signature without its date template.

See [TextExpander's export instructions](https://textexpander.com/learn/using/importing-and-exporting-snippet-groups).

## Conversion behavior

- Names use the label, then the abbreviation, then `Untitled`. A group prefix is optional.
- Snippet text, including spaces, tabs, and line breaks, is preserved. Whitespace-only snippets are supported.
- Suggested Snippets groups are excluded, ignoring case and surrounding spaces. For CSV sources, the group name comes from the filename.
- Snippets without plain text, including image-only snippets, are excluded. Exact source duplicates of name, text, and keyword are excluded across the combined input.
- Rich text exports its plain-text representation. Formatting and images are omitted. Scripts export their source as text and never execute.
- Keywords with whitespace, backticks, or quotation marks are flagged for editing. Keyword conflicts are checked among selected snippets and against the supplied Raycast export, if any. Keeping an incoming snippet does not replace a snippet in your live Raycast library.
- Source expansion modes, per-app rules, and usage statistics are not transferred.

## Macro conversion

Macro conversion is off by default and applies only to plain-text snippets. Supported conversions are:

| TextExpander | Raycast                                         |
| ------------ | ----------------------------------------------- |
| `%clipboard` | `{clipboard}`                                   |
| `%\|`        | `{cursor}`, when the result has only one cursor |
| `%Y-%m-%d`   | `{date format="yyyy-MM-dd"}`                    |
| `%H:%M:%S`   | `{date format="HH:mm:ss"}`                      |

Date runs support `%Y`, `%y`, `%m`, `%d`, `%H`, `%M`, and `%S`, with spaces and common separators. If a snippet contains an unsupported or ambiguous macro, an escaped percent sequence, or multiple cursor positions, the entire snippet stays unchanged for manual review. Fill-ins, nested snippet references, keyboard actions, and date arithmetic are not automatically converted.

Review the original and current export before importing. [Raycast dynamic placeholders](https://manual.raycast.com/dynamic-placeholders) expand when a snippet is used.

## Save and resume

Press **⌘S** or choose **Save Progress** in the preview to save one local migration snapshot. It includes source snippets, comparison snippets, edits, renamed groups, and selection. Saving again replaces the previous snapshot.

Choose **Resume Saved Migration** in the Source dropdown or the source form's action panel to continue. Resuming uses the saved snapshot and does not re-read files. Start a new preview to read source changes. **Delete Saved Progress** removes the snapshot from Raycast's extension storage. Progress is saved only when you request it.

## Reports and group exports

Reports list names, keywords, sources, changes, warnings, and selection or exclusion reasons. Snippet bodies are omitted. Suggested Snippets are excluded before conversion and appear only as counts per source.

A single-file export can include a sibling `*.report.json`. A group export creates a new `*-groups` folder with numbered, sanitized filenames and an optional report. Export files use `0600` permissions; group folders use `0700`. If a multi-file export fails, only files and folders created by that export are removed.

## Run locally

Requires macOS, Raycast, and Node.js 22.22.2 or later.

```sh
npm ci
npm run dev
```

Raycast registers the development command. Keep the development process running while editing.

## Development checks

```sh
npm run check
```

This runs TypeScript, lint, formatting, metadata validation, and the distribution build.

See [CONTRIBUTING.md](CONTRIBUTING.md) for release checks and Store submission steps. Raycast's [snippet documentation](https://manual.raycast.com/snippets) describes the import format.
