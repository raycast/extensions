# Rinse

> Rinse the Claude off your clipboard.

A [Raycast](https://raycast.com) extension.

You copy Claude's response out of your terminal. It's wrapped at 80 characters with a two-space indent on the continuation:

```txt
You don't need a library for this. Lift the state, pass it down, and call it
  done.
```

Rinse joins and strips it:

```txt
You don't need a library for this. Lift the state, pass it down, and call it done.
```

Or it's full AI CLI output with box-drawing and spinner noise:

```txt
╭─ Claude ──────────────────────╮
│ ⠹ Thinking...                 │
│ Just use a hook. You're done. │
╰───────────────────────────────╯
```

Becomes:

```txt
Claude Thinking...
Just use a hook. You're done.
```

Copy. Clean. Paste. Done.

## Install

1. Clone this repo
2. `cd` into the `rinse` directory
3. Run `npm install && npm run dev`
4. Raycast picks it up automatically and it appears at the top of root search

## Commands

### Clean Clipboard

Silent and instant. Reads your clipboard, strips the noise, writes it back. You get a quick HUD confirmation and move on. No windows, no friction.

> **"So fresh and so clean, clean."**

### Clean & Paste Clipboard

Cleans your clipboard and pastes the result directly into the focused app in one shot. No intermediate step. Copy Claude's output, trigger the command, and clean text lands where your cursor is.

> **"Straight bougie!"**

### Clean & Review Clipboard

Opens a preview of the cleaned result before committing. The sidebar shows exactly how much was removed: character counts, line counts, reduction percentage. When you're happy, one action copies it to your clipboard.

> **"Confirm the baby. Toss the bathwater."**

## What Gets Cleaned

| Artifact                      | Example                                              |
| ----------------------------- | ---------------------------------------------------- |
| ANSI escape codes             | `\x1B[32mGreen text\x1B[0m` to `Green text`          |
| Box-drawing characters        | `╭─ header ─╮`, `│ content │`, `╰────────╯`          |
| Spinner and Braille chars     | `⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏`                                    |
| Decorative separator lines    | Lines of `---`, `===`, `~~~`, `***`                  |
| Pipe borders                  | Leading/trailing `│` and `\|` column borders         |
| Trailing whitespace / padding | Lines padded to a fixed column width with spaces     |
| Whitespace-only lines         | Blank lines composed entirely of spaces              |
| Soft-wrapped lines            | Terminal-wrapped lines rejoined into full paragraphs |
| Excessive blank lines         | 3+ consecutive blank lines collapsed to 2            |

## What Stays Intact

Rinse is careful not to over-clean. It preserves:

- **Fenced code blocks**: content inside ` ``` ` is never touched
- **List structure**: lines starting with `-`, `*`, `>`, or numbered lists aren't merged
- **Sentence boundaries**: lines ending with `.`, `?`, `!`, or `:` don't get merged into the next line
- **Indented code**: lines indented relative to surrounding text are treated as code and left alone
- **Markdown tables**: multi-column tables (`| a | b |`) are preserved as-is; single-column rows (`| content |`) are treated as terminal pipe borders and stripped

## Tips

- Assign a hotkey to **Clean Clipboard** (`Cmd+Shift+C`) to clean without opening Raycast.
- Assign a hotkey to **Clean & Paste** (`Cmd+Shift+V`) to replace your paste with a clean paste.
- Use **Clean & Review** when you want to see the diff before committing.
