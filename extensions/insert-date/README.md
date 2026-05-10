# Insert Date

Insert the current date at the cursor in any app — instantly, with no popup.

## How It Works

Bind a hotkey to **Insert Date at Cursor**. Hit it in any app (Notes, Mail, TextEdit, your code editor, a terminal) and the formatted date is inserted wherever the cursor is. Raycast never opens.

## Format Options

Choose your format once in the extension preferences — it sticks until you change it.

| Format | Example |
|--------|---------|
| ISO (default) | `20260507` |
| US | `05/07/2026` |
| EU | `07/05/2026` |
| Long form | `May 7, 2026` |
| Abbreviated | `Thu, May 7` |
| Date + time | `2026-05-07 21:07` |
| Time only | `21:07` |
| Custom | anything you define |

## Custom Format

Select **Custom** in the dropdown and enter your own format using these tokens:

| Token | Output |
|-------|--------|
| `YYYY` | 2026 |
| `MM` | 05 |
| `DD` | 07 |
| `HH` | 21 |
| `mm` | 07 |
| `ss` | 30 |

Examples: `YYYY/MM/DD` → `2026/05/07`, `DD.MM.YYYY` → `07.05.2026`

## Setup

1. Import the extension in Raycast
2. Open **Raycast → Settings → Extensions → Insert Date at Cursor**
3. Choose your preferred format
4. Set a hotkey (e.g. `⌃⌥⇧D`)
