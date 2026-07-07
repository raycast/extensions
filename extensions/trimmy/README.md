# Trimmy

"Paste once, run once." — Trimmy is a Raycast extension for cleaning copied shell snippets, wrapped URLs, and path-like text so they are easier to run or paste.

[Trimmy](https://trimmy.app) was created by [steipete](https://github.com/steipete).

## Commands

- **Trim and Copy** — cleans the current input and puts the result on your clipboard
- **Trim and Paste** — cleans the current input and pastes it into the frontmost app
- **Trim and Preview** — shows the original and trimmed output before you choose what to do next

## Input resolution

By default, Trimmy uses this order:

1. selected text in the frontmost app
2. selected Finder item path (macOS only)
3. clipboard text

You can disable that behavior per command with the **Prefer Selection / Finder** preference if you want strict clipboard-only behavior.

## Aggressiveness

- **Low (safer)**: most conservative; best when you only want very obvious command snippets flattened
- **Normal**: works well for most README and blog-style command snippets; default for Preview Trim
- **High (eager)**: trims more aggressively, even when the command signal is weaker; default for Trim and Trim and Paste

## Cleaning behavior

The current implementation ports the most useful Trimmy features for Raycast:

- strips shell prompt prefixes like `$` and `#`
- repairs wrapped URLs that were split across lines
- quotes path-like text with spaces when it looks safe to do so
- removes copied terminal box-drawing characters
- detects likely multi-line commands using prefixes, punctuation, pipelines, continuations, and indentation
- flattens matching commands into a single space-normalized line

## Preview mode

**Preview Trim** uses a Raycast view command to show the original input and trimmed output, inspired by the selection-preview pattern used in Raycast's JSON Format extension.

## Known limitations

- Detection is heuristic, not shell-parser based.
- Path quoting is intentionally conservative and skips strings that look like full shell commands with flags.
- Box-drawing cleanup is best-effort and optimized for copied terminal snippets.
