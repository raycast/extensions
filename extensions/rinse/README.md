# Rinse

> Rinse the Claude off your clipboard.

A [Raycast](https://raycast.com) extension that strips AI CLI formatting artifacts — ANSI codes, box-drawing characters, spinner noise, soft-wrapped lines — from whatever you just copied out of your terminal.

Claude answered your question. The answer is good. The packaging is not:

```txt
╭─ Claude ───────────────────────────╮
│ ⠹ Thinking...                      │
│ Strip the noise and toss the       │
│   box, that's Rinse.               │
╰────────────────────────────────────╯
```

Or it word-wrapped at 80 columns with an indent on the continuation:

```txt
Strip the noise and rejoin the
  lines, that's Rinse.
```

Rinse takes the baby, tosses the bathwater:

```txt
Strip the noise and toss the box, that's Rinse.
```

```txt
Strip the noise and rejoin the lines, that's Rinse.
```

## Install

1. Clone this repo
2. `cd` into the `rinse` directory
3. Run `npm install && npm run dev`
4. Raycast picks it up automatically and it appears at the top of root search

## Commands

### Clean & Copy

Reads your clipboard, strips the noise, writes it back. Silent, instant, no window. A HUD flash tells you how much was rinsed, and you're back to what you were doing.

### Clean & Paste

Same as Clean & Copy, but skips the clipboard. The cleaned text lands directly where your cursor is. Copy from Claude, trigger the command, paste is already done.

### Clean & Review

Opens a preview of the cleaned result before you commit. The sidebar shows character counts, line counts, and reduction percentage. One action copies it to your clipboard when you're ready.

> Confirm the baby. Toss the bathwater.

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

- Assign a hotkey to **Clean & Copy** (`Cmd+Shift+C`) to clean without opening Raycast.
- Assign a hotkey to **Clean & Paste** (`Cmd+Shift+V`) to replace your paste with a clean paste.
- Use **Clean & Review** when you want to see the diff before committing.
