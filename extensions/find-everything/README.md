# Find Everything — better than Spotlight

Instant file search for Raycast that does **not** use Spotlight. Works with Spotlight indexing completely disabled — or just finds the files Spotlight never shows you (dotfiles, gitignored work, `~/Library` is intentionally out, caches are filtered).

## Why

Spotlight either consumes too much CPU/IO to keep enabled, or misses half your files. Find Everything keeps its own lightweight index — built once by `fd`, filtered by `rg`, ranked by `fzf`. Queries take ~100–150 ms even over millions of indexed paths.

## Features

- **Instant fuzzy search** — type, get results in ~30 ms. No Enter, no waiting.
- **Persistent index per scope** — built once, auto-refreshed in the background when stale (`⌘R` forces a rebuild).
- **Real Finder icons**, file size, modification date, folder badges.
- **Two-line results** — file name + smart middle-truncated path. `⌘D` toggles a detail pane with full path, metadata and image preview.
- **Scopes** — Home, Downloads, Documents, Applications, All (`/`), or your own comma-separated paths.
- **Actions** — Open `↵`, Reveal in Finder, Open in Terminal `⌘T`, Copy Path `⌘C`, Copy File `⌘⌥C`, Rebuild Index `⌘R`.
- **Sane defaults** — `node_modules`, `.git`, build outputs, venvs and tool caches are excluded automatically; extend via preferences.

## Requirements

macOS or Linux with [fd](https://github.com/sharkdp/fd), [fzf](https://github.com/junegunn/fzf) and [ripgrep](https://github.com/BurntSushi/ripgrep):

```bash
brew install fd fzf ripgrep        # macOS
sudo apt install fd-find fzf ripgrep   # Debian/Ubuntu
```

## Standalone CLI (`fe`)

The same engine runs as a standalone terminal tool on macOS and Linux — shareable with the Raycast extension via the same index.

```bash
fe                    # interactive picker: type to search, enter opens, ^R rebuilds
fe <query>            # quick search, ranked paths on stdout
fe index --scope home # (re)build + shard an index
fe status             # binaries + index health
```

Install: grab a binary from the [Releases](https://github.com/Supersynergy/find-everything/releases) page (`fe-darwin-arm64`, `fe-darwin-x64`, `fe-linux-x64`, `fe-linux-arm64`) and put it on your `PATH` as `fe`. Or build from source: `bun build --compile ./src/cli.ts --outfile fe`.

## Usage

Open the **Find Everything** command, type at least 2 characters. Switch scope in the dropdown. Recommended: assign your preferred hotkey in Raycast Settings → Extensions → Find Everything.

## How it works

1. `fd` scans the scope once into `~/.cache/hypersearch/index-<scope>.txt` (stale-while-revalidate).
2. The index is split into 8 shards; `rg` scans them **in parallel**, capped per shard — ~30 ms typical, worst-case queries stay ~30 ms instead of seconds.
3. `fzf --filter` fuzzy-ranks the candidates; results whose basename contains all query terms float to the top.

## Usage

Open the **Find Everything** command, type at least 2 characters. Switch scope in the dropdown. Recommended: assign your preferred hotkey in Raycast Settings → Extensions → Find Everything.

## How it works

1. `fd` scans the scope once into `~/.cache/hypersearch/index-<scope>.txt` (stale-while-revalidate).
2. `rg` fixed-string-filters the index to candidate matches (~120 ms on a 4.6M-line index).
3. `fzf --filter` fuzzy-ranks the candidates; results whose basename contains all query terms float to the top.

## License

MIT
