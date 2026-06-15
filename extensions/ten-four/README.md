# Ten Four

**"10-4, copy that."** A shelf of clean, copyable snippets, pushed from your
terminal or from **Claude Code**, browsed and copied from **Raycast**.

When a tool prints something you want to copy (a URL, an API key, a command, a
code block), copying it straight out of the terminal gives you mangled line
breaks and stray indentation, because you're selecting reflowed text off the
character grid. Ten Four fixes the root cause: snippets travel as **data**, never
as rendered terminal text. You copy them out of Raycast with the exact bytes
intended, with no wrapping and no leading spaces.

## How it works

```
your terminal / Claude Code  ──tenfour──▶  ~/.ten-four.json  ──▶  Raycast "Ten Four"
        (writer)                            (the shelf)              (reader)
```

- **`tenfour`**: a tiny, dependency-free Node CLI that appends a snippet to the
  shelf file.
- **Ten Four (Raycast extension)**: a searchable list of your snippets. Hit your
  Raycast hotkey, type a letter or two, press <kbd>↵</kbd> to copy (or
  <kbd>⌘</kbd> to paste into the front app).

## Install

### 1. The Raycast extension

From this repo (developer mode):

```sh
npm install
npm run dev      # registers "Ten Four" in Raycast; keep running while developing
```

Or, once published, install **Ten Four** from the Raycast Store.

### 2. The CLI

Easiest: open the **Install Ten Four CLI** command inside Raycast and click
**Install CLI**. It copies `tenfour` into your `PATH` for you.

Or from the terminal:

```sh
./install.sh        # symlinks assets/tenfour into your PATH
```

## Usage

```sh
tenfour "https://my-app.up.railway.app"          # label = first line
tenfour --label "API key" "sk-live-…"            # explicit label
printf 'def hi():\n    return 1\n' | tenfour -l "snippet" -   # multiline via stdin
tenfour list                                     # print the shelf
tenfour clear                                    # empty the shelf
```

Then summon Raycast → **Ten Four Shelf** → copy.

## Use with Claude Code

Add this to your `CLAUDE.md` so Claude pushes copyable snippets automatically:

```md
When you output a snippet I'm likely to want to copy (a URL, token, command,
path, or code block), also run:
  tenfour --label "<short label>" "<the exact text>"
so it lands on my Ten Four shelf with clean formatting.
```

## Configuration

- **Shelf location:** `~/.ten-four.json` by default. Override with the
  `TENFOUR_FILE` environment variable (set it for both the CLI and Raycast).
- The shelf keeps the most recent 200 snippets; pinned snippets are never
  trimmed.

## Notes

- The CLI is Node.js (zero dependencies) so it can ship as a single file inside
  the extension. It requires `node` on your `PATH`. A future Go rewrite would
  allow a dependency-free Homebrew bottle.

## License

MIT
