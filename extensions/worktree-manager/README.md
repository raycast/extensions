# Worktree Manager

Search Git worktrees across multiple repo roots and open them in your editor. Create new worktrees from the same interface.

## Commands

- **Search Worktrees** – List all worktrees from your configured root folder. Search by path, branch, or repo name. Open in editor (Enter), Show in Finder, or Copy path.
- **Create Worktree** – Pick a repo and branch; the new worktree is created in your default worktree folder (e.g. `reponame-branch`).

## Setup

1. Open **Extension Preferences** (⌘ ,) and set:
2. **Root path** – Folder that contains your Git repos (and their worktrees).
3. **Default worktree path** – Folder where new worktrees will be created (e.g. `reponame-branch` subfolders).
4. **Open with** – App to open worktrees (e.g. Cursor, VS Code).

## Preview / screenshots (Store)

Screenshots live in [`metadata/`](metadata/): `worktree-manager-1.png`, `worktree-manager-2.png`, … (up to 6). Size: **2000 × 1250 px**, 16:10, PNG.

## Local development

```bash
npm install
npm run dev
```

With Raycast open, this loads the extension in development mode.

## Build

```bash
npm run build
```

## Publish

```bash
npm run publish
```

Requires GitHub authentication; opens a pull request to the Raycast extensions repository.
