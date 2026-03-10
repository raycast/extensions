# Add path argument to Open Worktree command

## Context
The "Open Worktree" command currently takes a worktree name and opens all apps at their root URLs. The user wants it to also prompt for a path (e.g. `/granola`) that gets appended to each app URL before opening.

## Changes

### `package.json`
- Add a second required argument `path` to the `open-worktree` command (line 17-24), with placeholder text like `Path (e.g. /granola)`

### `src/open-worktree.ts`
- Read the new `path` argument from `props.arguments` (around line 7)
- Append `path` to each `app.url` when opening (line 32)

## Verification
1. Run `npm run build` to check for type errors
2. Open Raycast, run "Open Worktree"
3. Verify it prompts for both worktree name and path
4. Enter a worktree and path, confirm the correct URL opens with path appended
