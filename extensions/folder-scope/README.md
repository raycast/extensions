# Folder Scope

Search text instantly inside the files of your active Finder folder, right from Raycast.

Folder Scope detects the folder you are working in (your Finder selection or frontmost Finder window), then streams live, as-you-type search results powered by [ripgrep](https://github.com/BurntSushi/ripgrep) — with a pure Node.js fallback so it always works, even offline with no ripgrep installed.

## Features

- **Finder-aware**: searches the folder selected in Finder, the parent folder of a selected file, or the frontmost Finder window's folder — no manual path entry needed.
- **Fast, streaming results**: matches appear as you type, with debouncing and cancellation of stale searches.
- **Plain text or regex**, with smart-case, case-sensitive, or case-insensitive matching, plus a whole-word toggle.
- **Rich results**: file name, relative path, line and column, and an optional detail view with highlighted match context.
- **Powerful actions**: open the file, jump to the exact line in your editor (VS Code, Cursor, Zed, Sublime Text, JetBrains Rider), reveal in Finder, copy path/line/context, exclude files or folders from the current session, search the parent folder, and more.
- **Respects `.gitignore`** and skips hidden files by default — both toggleable per search.

## Installation

Install **Folder Scope** from the Raycast Store.

For development setup, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Usage

1. In Finder, select a folder (or a file, or just have a Finder window open).
2. Open Raycast and run **Search Content**.
3. Type your query. Results stream in live.

The results header above the match list shows the active folder and how it was detected. The dropdown in the search bar switches between plain-text and regex modes and case behavior. The action panel (`⌘K`) exposes all result actions, search-option toggles, and directory actions (change directory, search parent folder, re-detect Finder, use home directory).

### How the search directory is chosen

1. The folder selected in Finder (or the parent folder of a selected file).
2. The folder of the frontmost Finder window.
3. If neither is available, the behavior you chose in preferences: ask you to pick a folder, use your configured default directory, or use your home directory.

## Search engines and fallback chain

Folder Scope resolves a search engine in this order (in **Automatic** mode):

1. **Bundled ripgrep** — downloaded on first use (see below).
2. **System ripgrep** — an `rg` found on your `PATH` or in common Homebrew locations.
3. **Node.js fallback** — a built-in pure-JavaScript engine; always available, needs no network and no installed tools.

If an engine is unavailable or fails to start, the next one in the chain is used automatically, and the UI shows which engine is active and why a fallback happened. An explicit engine preference starts the chain at that engine and still falls back downward so a search always runs. Results from different engines are never mixed: once an engine has produced results, its output is kept even if it later fails.

### Bundled ripgrep

The bundled engine downloads the official prebuilt ripgrep binary from [microsoft/ripgrep-prebuilt](https://github.com/microsoft/ripgrep-prebuilt) (version `v13.0.0-10`) on first use — about 2 MB, once. The download is verified against a hardcoded SHA-256 checksum for your CPU architecture (Apple Silicon or Intel) before it is installed into the extension's support directory. No binary is shipped inside the extension package. If the download fails (for example, offline), the engine resolver simply falls back to system ripgrep or the Node.js engine.

ripgrep is dual-licensed MIT / Unlicense; the prebuilt distribution is MIT-licensed. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Preferences

| Preference | Default | Description |
| --- | --- | --- |
| Default Search Directory | — | Used when no Finder directory can be detected. |
| When No Finder Directory Is Available | Use My Home Directory | Use home, prompt for a folder, or use the default directory. The UI shows when a fallback is in use. |
| Search Engine | Automatic | Automatic, bundled ripgrep, system ripgrep, or Node.js fallback. |
| Default Case Sensitivity | Smart case | Case-insensitive unless the query contains an uppercase letter. |
| Default Search Mode | Plain text | Plain text or ripgrep-style regular expression. |
| Default Search Depth | Unlimited | Maximum directory depth; `1` searches only the current folder. |
| Maximum Results | 250 | Stop after this many results. |
| Maximum File Size (MB) | 10 | Larger files are skipped. |
| Preview Context Lines | 0 | Context lines above and below the match in the preview (0–10). |
| Match Preview | On | Whether the detail preview starts open; toggle anytime from the action panel. |
| Hidden Files | Off | Include dotfiles and hidden directories. |
| Ignore Files | On | Respect `.gitignore`, `.ignore`, and similar files. |
| Excluded Directories | `.git, node_modules, …` | Directory names that are never searched. |
| Default File Extensions | All files | Comma-separated extensions to restrict the search to. |
| Search Debounce (ms) | 200 | Delay after typing before the search starts (50–1000 ms). |
| Preferred Code Editor | VS Code | Editor used by “Open in Editor” to jump to the matching line. |

## Security and permissions

- **Finder Automation permission**: to detect the frontmost Finder window's folder, the extension asks Finder via AppleScript. The first time, macOS prompts you to allow Raycast to control Finder. If you decline, Folder Scope still works — it clearly reports the missing permission and falls back to your configured default directory behavior. You can grant the permission later in **System Settings → Privacy & Security → Automation → Raycast → Finder**.
- **No shell execution**: ripgrep is spawned directly with an argument array (`shell: false`). Your query, folder path, and filters can never be interpreted as shell commands, and they cannot influence which executable runs or its output protocol.
- **Verified downloads**: the bundled ripgrep binary is fetched only from the official GitHub release of `microsoft/ripgrep-prebuilt` and is rejected unless its SHA-256 checksum matches the value hardcoded in the source.
- **Local only**: searches run entirely on your machine. The extension makes no network requests other than the one-time bundled ripgrep download, and collects no data.

## Architecture

```
src/
  search-content.tsx    Raycast List UI (command entry point)
  components/           Directory picker form
  hooks/                Search lifecycle (debounce, cancellation, batching)
                        and Finder directory resolution state
  services/             Search engines (bundled/system ripgrep, Node fallback),
                        engine resolver with the fallback chain, Finder
                        AppleScript service, editor launcher
  utils/                Pure logic: ripgrep argument builder, --json stream
                        parser, option validation, glob/ignore matching,
                        binary install with checksum verification
  types/                Domain types
```

All non-trivial pure logic is covered by `node --test` unit tests.

## Known limitations

- **Node.js fallback engine divergences from ripgrep** (only relevant when neither bundled nor system ripgrep is available):
  - Regular expressions use the JavaScript dialect, not ripgrep's Rust regex syntax.
  - Column numbers are UTF-16 based, while ripgrep reports byte offsets.
  - Glob support is a subset: `*`, `**`, and `?` (no `{a,b}` alternation or `[…]` classes).
  - Ignore-file support is a subset: `.gitignore`/`.ignore` only, no `!` negation patterns, and ignore files in parent directories of the search root are not read.
  - Files are decoded as UTF-8 only.
  - Multiline matches are reported on their first line.
- **Match highlighting** is only available in the detail view (toggle “Show Match Preview”), and only for Markdown and plain-text files; code and data files render as a monospaced code block, where Raycast's markdown cannot bold the matched range. Raycast list rows accept plain text only.
- **No free-form ripgrep arguments**: every supported flag is exposed as a validated option instead, so user input can never reach the process boundary unchecked.
- **No encoding selection**: ripgrep's automatic UTF-8/UTF-16 BOM detection covers the practical cases.
- The bundled engine needs a one-time network download; offline first use falls back to system ripgrep or the Node engine.

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
