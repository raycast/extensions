<div align="center">
  <img src="assets/icon.png" width="128" alt="Diff Checker" />
  <h1>Diff Checker</h1>
</div>

Two commands for comparing text and JSON directly in Raycast — everything runs locally, nothing leaves your machine.

## Commands

### Check Diff

Compare any two plain-text snippets line by line. Paste an original and a changed version — additions are marked with `>>>` and removals with `<<<`. If both inputs are identical, a toast will let you know.

### Compare JSON

Compare two JSON objects with a git-style diff view. Only changed lines are shown alongside a few lines of context — large unchanged sections are collapsed so differences are immediately visible without scrolling.

- Real-time JSON validation with inline error messages as you type
- Compact diff view with context — unchanged sections collapse with a count (e.g. *564 unchanged lines hidden*)
- Color-coded metadata sidebar showing added and removed line counts
- Format JSON action to pretty-print both inputs before comparing
- Swap action to flip original and modified
- Paste from Clipboard action to quickly fill either field
- Copy Full Diff, Copy Compact Diff, or Copy Formatted JSON from the result view