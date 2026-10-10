<div align="center">
    <br/>
    <br/>
    <img src="./assets/icon.png" alt="FSearch" width="100"/>
    <h3>FSearch</h3>
    <p>Instant whole-disk file search with fuzzy names, typo tolerance, and indexed content search</p>
    <p align="center">
        <a href="https://buymeacoffee.com/0xdhrv"><img alt="Buy Me a Coffee" src="https://shieldcn.dev/badge/buymecoffee-FFDD04.svg?size=default&amp;theme=neutral&amp;logo=buymeacoffee" /></a>
        <a href="https://github.com/0xdhrv"><img alt="GitHub" src="https://shieldcn.dev/badge/github-181717.svg?size=default&amp;theme=neutral&amp;logo=github" /></a>
        <a href="https://x.com/0xdhrv"><img alt="Twitter" src="https://shieldcn.dev/badge/twitter-1DA1F2.svg?size=default&amp;theme=neutral&amp;logo=x" /></a>
    </p>
    <br/>
    <br/>
</div>

Search your whole disk from Raycast. This extension is a frontend for [fsearch](https://github.com/noahdunnagan/fsearch) by [Noah Dunnagan](https://github.com/noahdunnagan): a macOS indexer that answers name queries in about a tenth of a millisecond and searches inside files from the same index.

Type a name, a folder, or a content query. Results open in the default app, in Finder, or in Quick Look. You can copy the path, the filename, or the file itself.

## Setup

Run **Install fsearch** in Raycast, or press ↵ on the "fsearch Is Not Installed" screen. A Terminal window opens and:

1. Offers to install Rust with [rustup](https://rustup.rs) if `cargo` is missing.
2. Clones and builds fsearch from source (about 30 seconds).
3. Installs it to `~/.local/bin/fsearch` as a login item, so the index stays warm.
4. Offers to open **System Settings → Privacy & Security → Full Disk Access**. Grant access to `~/.local/bin/fsearch` to index everything. Do this again after each update.

Run the command again later to update fsearch. If you installed the binary somewhere else, set **fsearch Binary** in the extension preferences.

The first run lists the whole disk (~25s). Search shows "Building Index" until it's ready.

## AI

Mention `@fsearch` in Raycast AI to find files in natural language:

- "@fsearch find PDFs in my Downloads modified this week"
- "@fsearch where is `parseResponse` defined in ~/Developer/app?"
- "@fsearch show me videos larger than 1 GB"

## Query Syntax

Queries are passed straight through to fsearch. Words are fuzzy, and words of five or more letters forgive one typo (`mian.rs` finds `main.rs`). Content search is smart-case.

| Example                          | Meaning                                            |
| -------------------------------- | -------------------------------------------------- |
| `mian.rs`                        | Fuzzy name match (one typo allowed for 5+ letters) |
| `readme in:~/Developer`          | Limit to a folder                                  |
| `type:image size:>5mb mtime:<7d` | Filter by type, size, and age                      |
| `ext:ts grep:TODO`               | Search inside files                                |
| `ext:rs regex:fn\s+\w+_dir`      | Regex inside files                                 |
| `sym:apply_dir`                  | Find where a symbol is defined                     |

Operators: `'exact`, `^prefix`, `suffix$`, `!exclude`.

Filters: `ext:`, `type:`, `kind:`, `in:`, `size:`, `mtime:`, `re:`, `path:`, `grep:`, `regex:`, `sym:`, `limit:`.

Name results show size and modified time. Content results list matching lines and can be expanded with **Toggle Details** (⌘⇧D).

## Credits

Search is powered by [fsearch](https://github.com/noahdunnagan/fsearch) by [Noah Dunnagan](https://github.com/noahdunnagan). fsearch crawls the disk once, follows changes, and keeps names and file contents in one index shared by the CLI and this extension. It is MIT licensed, copyright Noah Dunnagan.

This Raycast extension is by [0xdhrv](https://github.com/0xdhrv).
