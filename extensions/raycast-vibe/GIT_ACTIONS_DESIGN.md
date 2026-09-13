# Vibe Git Actions Design

Status: IMPLEMENTED

## Goal

Add a safe Git workflow to the Vibe Raycast folder action panel so users can fetch updates, switch branches, pull the latest fast-forwardable changes, and refresh repository status without opening a terminal.

## User Experience

The existing folder action panel gets a single **Git Actions** submenu. The main folder action list stays compact. The submenu contains:

- **Fetch and Refresh Status**
- **Switch Branch**
- **Pull Latest**

All Git commands run from the detected repository root, even when the selected folder is nested inside the repository.

## Safety Contract

### Uncommitted changes

If the repository has uncommitted changes, Vibe asks for confirmation before switching branches.

The confirmation explains that changing branches with local changes can cause conflicts or prevent the switch. The user can cancel without changing the repository.

### Remote branches

Local branches appear first. Remote branches appear in a separate section.

Selecting a remote branch requires a second confirmation. If confirmed, Vibe creates a local tracking branch using the remote branch as its upstream, then switches to it.

No remote branch is created automatically without this confirmation.

### Pull behavior

Pull uses:

```bash
git pull --ff-only
```

Vibe never automatically merges or rebases.

If the local and remote branches have diverged, the operation fails with a clear message telling the user to resolve it manually in a terminal.

### Excluded operations

The first version does not include:

- Reset.
- Discard changes.
- Stash.
- Merge.
- Rebase.
- Delete branch.
- Force push.
- Create a new branch.

These operations can destroy or rewrite work and should not be added to a quick action panel without a separate design pass.

## Operations

### Fetch and Refresh Status

Run:

```bash
git fetch --all --prune
```

Then re-inspect the repository and refresh the folder item. The action should show a loading state, followed by a success or failure toast.

### Switch local branch

List local branches with Git. Show the current branch and branch names in a searchable Raycast list.

Before switching:

1. Detect whether the working tree is dirty.
2. If dirty, show a confirmation.
3. If the user confirms, run the branch switch from the repository root.
4. Refresh the folder status after completion.

### Switch remote branch

List remote branches after local branches. Exclude symbolic references such as `origin/HEAD`.

When selected:

1. Check whether the working tree is dirty.
2. If dirty, confirm the branch switch.
3. Confirm creation of a local tracking branch.
4. Create the branch from the selected remote branch.
5. Refresh the folder status.

Expected command shape:

```bash
git switch --track -c <local-name> <remote-name>
```

The implementation must quote or pass branch names safely and must not construct a shell command from untrusted branch text without escaping.

### Pull latest

Before pulling, refresh the repository status. If the working tree is dirty, ask for confirmation because pulling can create conflicts.

Run:

```bash
git pull --ff-only
```

After success, refresh the folder status and show the result. If Git reports divergence, show a failure toast with a manual-resolution message. Do not run merge or rebase automatically.

## Error Handling

Errors should be translated into short user-facing messages:

- No repository found: `This folder is not inside a Git repository.`
- Dirty working tree: `This repository has uncommitted changes.`
- Diverged branch: `Branches have diverged. Resolve manually in Git.`
- No upstream: `This branch has no upstream remote.`
- Fetch failure: `Could not fetch from the remote.`
- Switch failure: `Could not switch to that branch.`
- Pull failure: `Could not pull the latest changes.`

The full Git error can be included in the toast message when it is short enough. Otherwise, show the concise message and keep the terminal as the place for detailed recovery.

## Implementation Scope

Minimal implementation in `src/vibe.tsx`:

- Add a `GitActions` submenu.
- Add Git branch parsing helpers.
- Add dirty-state detection.
- Add confirmation dialogs.
- Add fetch, switch, and pull actions.
- Reuse existing `git`, `inspectGit`, `FolderActions`, and refresh flow.
- Keep the existing terminal launcher unchanged.

No new dependency is required.

## Acceptance Criteria

- Git Actions appears only when the selected folder belongs to a repository.
- Fetch uses `git fetch --all --prune` and refreshes status.
- Pull uses `git pull --ff-only`.
- Diverged pulls do not merge or rebase.
- Dirty branch switches require confirmation.
- Dirty pulls require confirmation.
- Local branches are searchable.
- Remote branches are clearly separated.
- Remote branch selection requires explicit tracking-branch confirmation.
- All operations run from the repository root.
- Successful operations refresh branch and status metadata.
- Failed operations show a useful toast and do not silently continue.
- `npm run build` and `npm run lint` pass.
