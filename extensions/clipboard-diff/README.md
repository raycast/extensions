# Clipboard Diff

Raycast command that takes the two most recent **text** entries from Raycast's clipboard history,
writes them to temp files, and opens them side by side with `code --diff`.

- Left pane: the older entry (`clipboard-previous.txt`)
- Right pane: the newest entry (`clipboard-latest.txt`)

## Preferences

| Preference | Default | Notes |
| --- | --- | --- |
| Editor CLI | `code` | Any CLI accepting `--diff a b` — `code-insiders`, `cursor`, `windsurf`, or an absolute path |
| Temp File Extension | `txt` | Set to `json`, `ts`, … to get syntax highlighting in the diff |

## Development

```bash
npm install
npm run dev     # keeps the command loaded in Raycast while running
npm run build   # type-check + build
```

Temp files live in `$TMPDIR/clipboard-diff-*/` and are cleaned up by macOS.
