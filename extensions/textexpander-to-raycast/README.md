# TextExpander to Raycast

A macOS Raycast extension that previews TextExpander snippets and saves a JSON file for Raycast's **Import Snippets** command. Inspired by [Ahmad Awais's textexpander-to-raycast](https://github.com/ahmadawais/textexpander-to-raycast).

## Convert your snippets

1. Open **Convert TextExpander Snippets** in Raycast.
2. Choose **Find Local TextExpander Settings**, or select a file or settings bundle yourself.
3. Choose whether to prefix snippet names with their group, then select **Preview Snippets**.
4. Browse snippets and review any warnings. Press Return to exclude or include a snippet. Filter by group or search by name and keyword.
5. Press **⌘⇧E** to export the selected snippets. Selection includes every group, even when a filter is active.
6. Choose an output folder and filename, then save.
7. Run Raycast's **Import Snippets** command and select the JSON file. The export screen can reveal the file in Finder or copy its path.

No data is uploaded. The extension reads your source files and writes a new JSON file only when you save. It does not modify TextExpander or import into Raycast automatically. Existing output files are never overwritten.

## Supported sources

| Source                                 | How to use it                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| TextExpander web CSV export            | Export a group from TextExpander's Import/Export page, then choose the CSV file. The filename becomes its group name. |
| Legacy `Settings.textexpander`         | Auto-detected in `~/Library/Application Support/TextExpander/`. Reads `snippetsTE2` and `groupsTE2`.                  |
| `.textexpander` or XML group export    | Choose a property list containing `name` and `snippetPlists`, or `groupInfo.groupName` and `snippetsTE2`.             |
| `Settings.textexpandersettings` bundle | Auto-detected at the same location, or choose a bundle yourself. Reads `group*.xml` files directly inside it.         |

Auto-detection checks the bundle before the legacy settings file and uses one source at a time. It does not search custom Dropbox/iCloud locations or newer TextExpander databases. Use manual file selection or a CSV export for those installations. Unzip compressed exports first.

CSV accepts `abbreviation`, `snippet`, and optional `label` headers, in any order. Headerless files must contain two or three columns in that order. Quoted commas, double quotes, and multiline text are supported. Empty files produce an empty preview. The [example CSV](examples/Email.csv) is safe to use for a first run. The [sample JSON](examples/converted-example.json) was exported through Raycast after excluding its date macro snippet.

Repeated column names and incomplete recognized headers are rejected. Correct the headers in your source CSV before trying again.

TextExpander's current web export instructions are documented [here](https://textexpander.com/learn/using/importing-and-exporting-snippet-groups).

## Conversion behavior

| TextExpander                                        | Exported Raycast JSON                             |
| --------------------------------------------------- | ------------------------------------------------- |
| Label, otherwise abbreviation, otherwise `Untitled` | `name`                                            |
| Plain text                                          | `text`, with whitespace and line breaks preserved |
| Nonempty abbreviation                               | `keyword`                                         |
| Group name                                          | Optional `[Group]` prefix on `name`               |

- Suggested Snippets are always excluded when the source group is named `Suggested Snippets`, ignoring case and surrounding spaces. For CSV, the group comes from the filename. Renaming that CSV also changes how the group is identified.
- Snippets with no plain text, including image-only snippets, are excluded and counted. Spaces, tabs, and line breaks are preserved, including snippets made entirely of whitespace.
- Exact duplicates of name, text, and keyword are excluded. Shared keywords remain visible with warnings so you can choose which snippets to keep.
- Keywords with whitespace, backticks, or quotation marks are flagged. Their original text is preserved. Edit those keywords in Raycast after import to enable expansion.
- Rich text exports its plain-text representation. Formatting and images are omitted.
- AppleScript and shell snippets export their source as text. They do not execute in Raycast.
- TextExpander macros, including fill-ins and date syntax, remain unchanged and are flagged for review. Replace them with [Raycast dynamic placeholders](https://manual.raycast.com/dynamic-placeholders) as needed. Existing Raycast placeholder syntax is also flagged because it may expand after import.
- TextExpander expansion modes, per-app rules, and usage statistics are not transferred.

The preview cannot check your existing Raycast library for keyword conflicts. Raycast handles its own import and duplicate detection. See the [Raycast snippet documentation](https://manual.raycast.com/snippets) for the JSON format and import flow.

## Run locally

Requires macOS, Raycast, and Node.js 22.22.2 or later.

```sh
npm ci
npm run dev
```

Raycast registers the development command. Run **Convert TextExpander Snippets** in Raycast. Keep the development process running while editing.

## Development checks

```sh
npm run check
```

Tests cover sanitized real TextExpander settings and group exports, binary-plist conversion with macOS `plutil`, settings bundles, CSV quoting, source filtering, warnings, JSON fidelity, overwrite protection, and retrying after a failed write. Fixture sources and sanitization are documented in [tests/fixtures/README.md](tests/fixtures/README.md).

See [CONTRIBUTING.md](CONTRIBUTING.md) for the release checks and Store submission steps.
