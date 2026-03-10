# Prompt for path before opening individual worktree apps

## Context
In the "List Active Worktrees" command, clicking an individual app action (e.g. "Open web") currently opens the app's root URL directly. The user wants to be prompted for a path (e.g. `/granola`) that gets appended to the URL before opening. The path is always required. The "Open All" action remains unchanged.

## Changes

### `src/list-worktrees.tsx`
- Replace each `Action.OpenInBrowser` (line 43-48) for individual apps with a custom `Action` that:
  1. Uses Raycast's `Action.Push` to push a `Form` view
  2. The form has a single required text field for the path
  3. On submit, opens `app.url + path` in the browser and shows a HUD

The form component will be a small inline component in the same file that accepts the app info as props.

## Verification
1. Run `npm run build` to check for type errors
2. Open Raycast, run "List Active Worktrees"
3. Select a worktree, choose an individual app action (e.g. "Open web")
4. Verify a form appears asking for a path
5. Enter a path like `/granola`, submit, and verify the correct URL opens
6. Verify "Open All" still works as before (opens all apps at root URL)
