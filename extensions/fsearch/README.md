# FSearch for Raycast

Instant, typo-tolerant search of every file on your Mac, powered by [noahdunnagan/fsearch](https://github.com/noahdunnagan/fsearch). Name search takes about a millisecond; content search is indexed.

## Install

fsearch has no prebuilt binaries yet, so it is built from source once. The command's home screen offers **Install FSearch in Terminal**, which runs this in a Terminal window (installing Rust with rustup first if needed):

```sh
cargo install --git https://github.com/noahdunnagan/fsearch
```

The extension finds fsearch in `~/.local/bin`, `~/.cargo/bin`, `/opt/homebrew/bin`, and `/usr/local/bin`. The daemon starts on your first search; the first crawl takes about 20 seconds.

**Full Disk Access.** macOS hides Desktop, Documents, Downloads, and parts of Library until fsearch has it. Grant it to Raycast (the daemon inherits it), or to `~/.local/bin/fsearch` if you run it as a login item via `fsearch install --login`. The home screen flags the missing access and offers **Rebuild Index** (⌘ ⇧ R) once it is granted.

## Search

| Query                   | Finds                                     |
| ----------------------- | ----------------------------------------- |
| `quarterly report`      | Fuzzy filename matches                    |
| `ext:pdf invoice`       | PDF invoices                              |
| `readme in:~/Developer` | Files within a folder                     |
| `type:image mtime:<7d`  | Recent images                             |
| `size:>100mb`           | Large files                               |
| `ext:ts grep:useEffect` | Text inside TypeScript files              |
| `regex:fn\s+\w+_dir`    | A regex inside files                      |
| `sym:apply_dir`         | Symbol definitions                        |
| `type:image,video`      | Several types (`ext:png,jpg` likewise)    |
| `size:1mb..10mb`        | A range (`mtime:2h..3d` likewise)         |
| `re:^IMG_\d+`           | A regex on the name (`path:` on the path) |

Words of five or more letters forgive one typo. `'exact`, `^prefix`, `suffix$`, `!exclude`, and `"quoted phrases"` tighten a match. `mtime:` takes s, m, h, d, w, mo, y. Shell wildcards work: `*.docx`, `report*.pdf`. Content search is smart-case.

The type menu adds a `type:` or `kind:` filter; leave it on Everything when writing your own. The search folder overrides `in:`; choose Entire Mac to let the query decide. Sorting applies to loaded results. Scrolling to the end loads more, up to 500, and raises the content-search read budget when results are partial.

## Features

- Home screen with saved searches (⌘ S), quick searches, and places. A saved search can become a Quicklink or a deeplink for a hotkey.
- Raycast AI tool: ask Raycast AI to find files and it calls fsearch with the same query syntax.
- Preview pane (⌘ D): images, text and code, Word, RTF, and OpenDocument text, archive listings, property lists, and Quick Look thumbnails of PDFs, Office files, HEIC, video, and fonts, with page counts, durations, and pixel sizes. Text previews open at the first matching line.
- Content matches with line numbers.
- Open, Open With, Reveal in Finder, Quick Look, copy the file, its name, or its path, paste it into the front Finder window or into the app behind Raycast, Move to Trash.
- Works as a Raycast fallback command: add **Search Files** under Manage Fallback Commands and typed text carries over.
- Automatic retries while the daemon starts or the index builds. Full Disk Access and stale-index detection with one-click fixes.

## Shortcuts

| Shortcut | Action                        |
| -------- | ----------------------------- |
| ⏎        | Open                          |
| ⌘ ⏎      | Reveal in Finder              |
| ⌘ Y      | Quick Look                    |
| ⌘ ⇧ C    | Copy file                     |
| ⌘ ⇧ V    | Paste file to Finder          |
| ⌘ ⌥ C    | Copy name                     |
| ⌘ ⌃ C    | Copy path                     |
| ⌘ ⌥ V    | Paste file to the front app   |
| ⌘ ⌃ V    | Paste path to the front app   |
| ⌃ X      | Move to Trash                 |
| ⌘ D      | Toggle preview                |
| ⌘ R      | Refresh                       |
| ⌘ S      | Save or remove search         |
| ⌘ ⇧ H    | Home                          |
| ⌘ ⇧ F    | Choose folder                 |
| ⌘ F      | Search selected file's folder |
| ⌘ ⇧ S    | Sort                          |
| ⌘ ⇧ O    | Open with                     |
| ⌘ ⇧ R    | Rebuild index                 |

## Preferences

| Preference         | Effect                                                        |
| ------------------ | ------------------------------------------------------------- |
| FSearch Executable | Optional path to the binary. Empty looks in the usual places. |
| Search Folder      | Default folder for every search.                              |
| Maximum Results    | Results per page.                                             |
| Results            | Whether the preview pane is open by default.                  |

## Privacy

Everything runs locally. The extension talks to the fsearch daemon over its Unix socket and spawns `fsearch stdio` only to start it. Previews use tools shipped with macOS (`qlmanage`, `textutil`, `unzip`, `tar`, `plutil`, `mdls`). Only saved searches are stored.

## Development

```sh
bun install
bun run dev        # live reload in Raycast
bun run typecheck
bun test
bun run build
bun run format:check
```

Source: https://github.com/qunash/fsearch-raycast-extension
