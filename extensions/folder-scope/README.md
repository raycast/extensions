# Folder Scope

Searches the contents of files in the folder open in Finder or in any folder you select, right from Raycast.

Folder Scope searches file contents using [ripgrep](https://github.com/BurntSushi/ripgrep), with Node.js as a fallback when ripgrep is unavailable.

## Features

* **Finder-aware**: searches the folder selected in Finder, the parent folder of a selected file, or the folder open in the frontmost Finder window.
* **Fast search**: results update as you type.
* **Plain text or regex**: supports smart-case, case-sensitive, case-insensitive, and whole-word matching.
* **Useful result details**: shows the file name, relative path, line and column, with an optional preview of the matching context.
* **File actions**: open a file, jump to the matching line in VS Code, Cursor, Zed, Sublime Text, or JetBrains Rider, reveal it in Finder, copy paths or context, exclude files or folders, and search the parent folder.
* **Respects `.gitignore`** and skips hidden files by default. Both can be changed for each search.

## Installation

Install **Folder Scope** from the Raycast Store.

For development setup, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Usage

1. In Finder, select a folder or file, or open the folder you want to search.
2. Open Raycast and run **Search Content**.
3. Type your query.

The results header shows the active folder and how it was detected.

The dropdown in the search bar lets you switch between plain-text and regex modes and change case sensitivity. The action panel (`⌘K`) contains result actions, search options, and directory actions such as changing the directory, searching the parent folder, re-detecting Finder, or using your home directory.

### How the search directory is chosen

Folder Scope checks for a directory in this order:

1. The folder selected in Finder, or the parent folder of a selected file.
2. The folder open in the frontmost Finder window.
3. If neither is available, the fallback selected in preferences: choose a folder, use the configured default directory, or use your home directory.

## Search engines

In **Automatic** mode, Folder Scope tries these search engines in order:

1. **Bundled ripgrep** - downloaded on first use.
2. **System ripgrep** - an existing `rg` installation found on your system.
3. **Node.js fallback** - the built-in JavaScript search engine.

If one is unavailable, Folder Scope automatically tries the next one.

You can also choose a preferred search engine from the extension preferences.

### Bundled ripgrep

Folder Scope can download a prebuilt ripgrep binary from [microsoft/ripgrep-prebuilt](https://github.com/microsoft/ripgrep-prebuilt) (`v13.0.0-10`) the first time it is needed.

The download is around 2 MB and is verified with a SHA-256 checksum before installation. Apple Silicon and Intel builds are handled separately.

If the download fails, Folder Scope uses system ripgrep or the Node.js fallback instead.

ripgrep is dual-licensed under MIT / Unlicense, and the prebuilt distribution is MIT-licensed. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Preferences

| Preference                            | Default                 | Description                                                                           |
| ------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| Default Search Directory              | —                       | Used when no Finder directory can be detected.                                        |
| When No Finder Directory Is Available | Use My Home Directory   | Use your home directory, ask for a folder, or use the configured default directory.   |
| Search Engine                         | Automatic               | Automatic, bundled ripgrep, system ripgrep, or Node.js fallback.                      |
| Default Case Sensitivity              | Smart case              | Case-insensitive unless the query contains an uppercase letter.                       |
| Default Search Mode                   | Plain text              | Plain text or ripgrep-style regular expression.                                       |
| Default Search Depth                  | Unlimited               | Maximum directory depth. `1` searches only the current folder.                        |
| Maximum Results                       | 250                     | Stops after this many results.                                                        |
| Maximum File Size (MB)                | 10                      | Larger files are skipped.                                                             |
| Preview Context Lines                 | 0                       | Number of context lines shown above and below the match (0–10).                       |
| Match Preview                         | On                      | Whether the detail preview starts open. It can also be toggled from the action panel. |
| Hidden Files                          | Off                     | Include hidden files and directories.                                                 |
| Ignore Files                          | On                      | Respect `.gitignore`, `.ignore`, and similar files.                                   |
| Excluded Directories                  | `.git, node_modules, …` | Directory names that are skipped during searches.                                     |
| Default File Extensions               | All files               | Comma-separated extensions used to limit the search.                                  |
| Search Debounce (ms)                  | 200                     | Delay after typing before a search starts (50–1000 ms).                               |
| Preferred Code Editor                 | VS Code                 | Editor used by **Open in Editor**.                                                    |

## Security and permissions

* **Finder Automation permission**: Folder Scope uses AppleScript to detect the folder open in the frontmost Finder window. macOS may ask you to allow Raycast to control Finder. If permission is denied, the extension uses your configured fallback directory instead. You can change this later in **System Settings → Privacy & Security → Automation → Raycast → Finder**.
* **No shell execution**: ripgrep is started directly with an argument array (`shell: false`). Search queries, paths, and filters are not passed through a shell.
* **Verified downloads**: the bundled ripgrep binary is downloaded from the GitHub release of `microsoft/ripgrep-prebuilt` and checked against a SHA-256 checksum before it is used.
* **Local search**: file searches run on your machine. The only network request made by the extension is the optional one-time download of bundled ripgrep. Folder Scope does not collect search data.

## Architecture

```text
src/
  search-content.tsx    Raycast List UI (command entry point)
  components/           Directory picker form
  hooks/                Search lifecycle, batching, and Finder directory state
  services/             Search engines, engine selection, Finder integration,
                        and editor launcher
  utils/                ripgrep arguments, JSON parsing, validation,
                        glob/ignore matching, and binary installation
  types/                Domain types
```

Non-trivial pure logic is covered by `node --test` unit tests.

## Known limitations

The following differences apply to the **Node.js fallback** when neither bundled nor system ripgrep is available:

* Regular expressions use the JavaScript regex syntax instead of ripgrep's Rust regex syntax.
* Column numbers are UTF-16 based, while ripgrep reports byte offsets.
* Glob support is limited to `*`, `**`, and `?`; `{a,b}` alternation and `[…]` classes are not supported.
* Ignore-file support is limited to `.gitignore` and `.ignore`. Negation patterns (`!`) and ignore files above the search root are not supported.
* Files are decoded as UTF-8.
* Multiline matches are reported using their first line.

Other limitations:

* **Match highlighting** is available only in the detail view when **Show Match Preview** is enabled, and only for Markdown and plain-text files. Code and data files are shown as monospaced code blocks because Raycast list rows do not support rich text highlighting.
* **No free-form ripgrep arguments**: supported options are exposed through the extension instead of passing arbitrary arguments to ripgrep.
* **No encoding selection**: ripgrep's automatic UTF-8/UTF-16 BOM detection is used.
* The bundled engine needs a one-time download. If it cannot be downloaded, Folder Scope uses system ripgrep or the Node.js fallback.

## Development

```bash
npm run dev        # develop in Raycast
npm test           # run unit tests
npm run lint       # lint
npm run build      # production build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) © Ömer Aydemir. Third-party components are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).