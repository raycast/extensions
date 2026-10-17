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

## Native app (macOS)

A standalone Raycast-style panel — no Raycast needed. Borderless floating window, global `⌥Space` hotkey, two-line results with Finder icons, and a `⌘K` action panel.

```bash
./install.sh        # app → ~/Applications, fe → ~/.local/bin, no sudo
```

On first launch the app checks for `fe`/`fd`/`rg`/`fzf` and offers to download whatever is missing straight from GitHub releases into `~/Library/Application Support/FindEverything/bin` — no Homebrew, no admin rights.

**Keyboard** — everything is reachable without the mouse:

| Key | Action |
|---|---|
| `⌥Space` | toggle panel (global) |
| `↑` `↓` `^N` `^P` `PgUp` `PgDn` `⌘↑` `⌘↓` `Home` `End` | navigate |
| `↵` | open |
| `⌘↵` | open containing folder |
| `⌥↵` | reveal in Finder |
| `⌘K` / `Tab` | action panel — type to filter, `→` enters submenus (Open With…, Switch Scope), `←`/`⎋` steps back |
| `⌘D` / `⌘I` | detail pane (path, size, date, image + text preview) |
| `⌘C` `⌘⇧C` `⌘⌥C` `⌘⌥⇧C` | copy path / name / file / contents |
| `⌘T` `⌘Y` `⌘O` `⌘I` | Terminal / Quick Look / reveal / Get Info |
| `⌘P` | pin to top |
| `⌘1`–`⌘6` `⌘⌥←` `⌘⌥→` | scopes |
| `⌘⌫` `⌘R` `⌘W` `⌘Q` `⎋` | trash / rebuild / hide / quit / back |
| `⌘/` | shortcuts cheat-sheet (also the `?` button) |

Results are grouped like Raycast: **Pinned** → **Recently Used** → **Applications** → **Files & Folders**.

Mouse works too: hover selects, double-click opens, rows **drag** as file references, right-click opens the same actions as a context menu (incl. Open With, Duplicate, Compress, Share), and the `⋯` button in the footer opens the action panel.

**Habits** — files you open land in "Recently Opened" (empty query) and rank higher next time. `⌘P` pins files above everything. Paste or type a full path (`/…` or `~/…`) to open it directly. History lives in `~/Library/Application Support/FindEverything/opens.json`, pins in `pins.json`.

## Usage

Open the **Find Everything** command, type at least 2 characters. Switch scope in the dropdown. Recommended: assign your preferred hotkey in Raycast Settings → Extensions → Find Everything.

### Query operators

| Operator | Example | Effect |
|---|---|---|
| `ext:` / `*.ext` | `invoice ext:pdf` · `*.md` | filter by extension (`;` lists: `ext:md;txt`) |
| `in:` / bare `in` | `invoice in downloads` · `in:~/code` | scope to a folder |
| `type:` | `type:image screenshot` | doc · image · video · audio · zip · code · app |
| `!` | `readme !node` | exclude matches |
| `a\|b` | `invoice\|rechnung` | OR alternation |
| `"…"` | `"release notes"` | exact phrase |
| `sort:` | `readme sort:new` | name · new · old · big · small |
| `size:` | `size:>50m` | filter by file size (`>`/`<`, k/m/g) |
| `dm:` | `dm:today report` | modified within today · week · `<n>d` |

`size:`/`dm:`/`sort:` post-filter the visible top results — the flat index stores paths only, which is what keeps it at ~30 ms.

## How it works

1. `fd` scans the scope once into `~/.cache/hypersearch/index-<scope>.txt` (stale-while-revalidate).
2. The index is split into 8 shards; `rg` scans them **in parallel**, capped per shard — ~30 ms typical, worst-case queries stay ~30 ms instead of seconds.
3. `fzf --filter` fuzzy-ranks the candidates; results whose basename contains all query terms float to the top.

## License

MIT
