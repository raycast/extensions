# Find Everything

Search files and folders in Raycast without Spotlight. Find Everything builds a persistent index with [fd](https://github.com/sharkdp/fd), filters candidates with [ripgrep](https://github.com/BurntSushi/ripgrep), and ranks fuzzy matches with [fzf](https://github.com/junegunn/fzf).

## Requirements

Install the three command-line tools on macOS:

```sh
brew install fd fzf ripgrep
```

Executables are resolved from Homebrew, standard system directories, `~/.local/bin`, `~/bin`, and `PATH`. The extension does not download or install tools.

## Usage

Open **Find Everything** and type at least two characters. Select Home, Downloads, Documents, Applications, All (`/`), or Custom paths from the scope dropdown. Set custom directories in the command preferences as comma-separated absolute paths.

The first search builds an index for the selected scope. Existing indexes are reused; stale indexes refresh in the background. Changing indexing preferences rebuilds the affected index. Hidden files, ignored files, additional excludes, refresh age, and result limit are configurable. Directories such as `node_modules`, `.git`, build outputs, caches, and `Library` are excluded by default. Results are limited to paths accessible to the current user.

Actions include Open, Reveal in Finder, Open in Terminal, Copy Path, Copy File Name, and Copy File. **Command-D** toggles file details and image previews. **Command-R** rebuilds the index, including when no results are shown. File metadata is loaded for the initial results and when selecting later entries.

### Query operators

| Operator          | Example                              | Effect                                                        |
| ----------------- | ------------------------------------ | ------------------------------------------------------------- |
| `ext:` / `*.ext`  | `invoice ext:pdf` / `*.md`           | Extension filter; semicolon-separated lists are supported     |
| `in:` / bare `in` | `invoice in downloads` / `in:~/code` | Restrict to a folder; absolute paths exclude sibling folders  |
| `type:`           | `type:image screenshot`              | doc, image, video, audio, zip, code, or app                   |
| `!`               | `readme !node`                       | Exclude matching paths                                        |
| `a\|b`            | `invoice\|rechnung`                  | Match either alternative                                      |
| `"…"`             | `"release notes"` / `"a\|b"`         | Literal phrase, including spaces and pipes                    |
| `sort:`           | `readme sort:new`                    | name, new, old, big, or small                                 |
| `size:`           | `size:>50m`                          | File size filter using bytes or k/m/g units                   |
| `dm:`             | `dm:week report`                     | Modified within today, week, or a number of days such as `7d` |

Size, modification-date, and sorting operators apply to the visible candidate set. The index contains paths, so these operators do not enumerate metadata for every indexed file. Search latency depends on index size, query, storage, and available resources.

## Standalone CLI

The optional CLI uses the same engine and index. Its source is included in this directory; the native macOS application is a separate project at [Supersynergy/find-everything](https://github.com/Supersynergy/find-everything).

Run from source with [Bun](https://bun.sh):

```sh
bun run src/cli.ts search 'invoice ext:pdf'
bun run src/cli.ts index --scope home
bun run src/cli.ts status
bun run src/cli.ts pick
```

To compile it, run `bun run build-cli`. The executable is written to `dist-bin/fe`. Linux CLI users can install `fd-find`, `fzf`, and `ripgrep` with their package manager; `fdfind` is supported as an alternative to `fd`. CLI searches wait for stale indexes to refresh before printing results. The CLI reuses the last saved indexing preferences for each scope, so switching between Raycast and the terminal does not rebuild a fresh index. Before the first build, its hidden-file default matches Raycast.

## Index storage

Indexes are stored at `~/.cache/hypersearch/index-<scope>.txt`, alongside settings and derived search shards. Shards contain complete path lines and are used only when they match the current index. Search filters preserve fuzzy subsequence matches. To bound ranking time and memory, candidate collection stops after all query constraints have been applied: up to 4,000 matches per shard, or 32,000 for the flat index and piped filters. The visible result limit applies after ranking this candidate set; broad queries do not rank every possible match.

## Development

```sh
bun install
bun run test
bun run build
bun run typecheck
```

The regression tests use a temporary home directory and do not rebuild your personal index. `bun run build` produces the distribution build under `dist/`.
