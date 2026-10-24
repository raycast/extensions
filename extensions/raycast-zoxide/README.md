# Raycast Zoxide

A [Raycast](https://www.raycast.com) extension that integrates with the [zoxide command-line tool by Ajeet D'Souza](https://github.com/ajeetdsouza/zoxide) for fast, frecency‑ranked directory navigation. History is shared with your shell — opening a directory here bumps its zoxide score just like `cd`-ing to it on the command line, and vice versa.

## Requirements

- **[zoxide](https://github.com/ajeetdsouza/zoxide#installation)** — required. The extension reads from and writes to your existing zoxide database.
- **[fzf](https://github.com/junegunn/fzf#installation)** — required **only** for the _Full Path (fuzzy)_ search mode. The _Folder Name (strict)_ mode queries zoxide directly and does **not** use fzf. See [Search modes](#search-modes).

Both tools are located via your `$PATH`. If zoxide or fzf is installed somewhere non‑standard (a version manager, a custom prefix, etc.) and isn't auto‑detected, add its directory under the **Additional path directories** preference. If zoxide can't be found at all, the **Search Directories** command shows install guidance and a shortcut to the extension's preferences.

## Commands

### Search Directories

Search your most frequently accessed directories and open the match. Each result offers:

- **Open in {App}** (`↵`) — open in the app set under _Open directories in_ (Finder by default)
- **Open in {Terminal App}** (`⌘↵`) — open in your terminal _(shown only when it differs from the Open‑in app)_
- **Open in {Editor App}** (`⌘⇧↵`) — open in your editor _(shown only when it differs from the Open‑in and terminal apps)_
- **Show in Finder** (`⌘F`) — reveal the directory in its enclosing folder
- **Open With…** (`⌘O`) — open in any other app
- **Search Using Spotlight** — fall back to Spotlight (see [Spotlight fallback](#spotlight-fallback))
- **Copy Path** (`⌘C`)
- **Boost in Zoxide** (`⌘B`) — bump the directory's score without opening it
- **Remove Result** (`⌃X`) — remove the entry from the zoxide database

### Add from Finder

Add a directory to your zoxide database without `cd`-ing to it. Uses the selected folder in Finder (or the front window's folder); if Finder has no selection or open window, a native folder picker is shown.

## Search modes

The **Search mode** preference controls how your query is matched — and which dependencies are needed:

| Mode | Matching | Dependency |
| --- | --- | --- |
| **Full Path (fuzzy)** _(default)_ | Loads your full zoxide list once, then fuzzy‑filters the **entire path** with fzf | Requires **fzf** |
| **Folder Name (strict)** | Re‑queries zoxide on each keystroke, matching the **folder name** with zoxide's native ranking | **zoxide only** |

Use _Full Path (fuzzy)_ for forgiving, type‑anywhere matching across deep paths — it mirrors zoxide's interactive jump command (`zi`, or `cdi` if you initialized zoxide with `--cmd cd`), which pipes your matches through fzf. Use _Folder Name (strict)_ if you don't have fzf, prefer zoxide's own ranking, or find full‑path matches too noisy.

## Spotlight fallback

If a search returns no results, you can search for directories via Spotlight instead. Spotlight results show a score of `0.0` since they aren't in zoxide yet; opening one adds it to zoxide for future scoring.

## Preferences

| Preference | Description |
| --- | --- |
| **Search mode** | _Full Path (fuzzy)_ or _Folder Name (strict)_ — see [Search modes](#search-modes). |
| **Open directories in** | The app the primary **Open** action uses. Defaults to Finder. |
| **Terminal application** | The app the **Open in Terminal** action uses. Defaults to Terminal. |
| **Editor application** | The app the **Open in Editor** action uses. Defaults to TextEdit. |
| **Additional path directories** | _(optional)_ Extra directories prepended to `$PATH` when running zoxide/fzf, in path syntax (e.g. `/opt/homebrew/bin:/usr/local/bin`). Use this if zoxide or fzf isn't auto‑detected. |
