# Worktree Deck

Worktree Deck is a Raycast extension for browsing git worktrees, related Codex sessions, and common repository actions from Raycast.

It is designed for local development workflows that use `git worktree`, Codex CLI/App, and optionally Zed, VS Code, or Cursor.

## Commands

- `Worktree Deck`: Browse worktrees, inspect related Codex sessions, open repositories, create pull requests, and run common worktree actions.
- `Worktree Status`: Show working and done session counts in the Raycast menu bar.

## First Setup

Worktree Deck starts with sensible defaults:

- Worktree directory: `~/.worktree-deck/worktrees`
- Codex home: `~/.codex`
- Local state: `~/.worktree-deck/storage`

On first launch, add a repository mapping when prompted:

1. Open `Worktree Deck` from Raycast.
2. Select `Add Repository Mapping`.
3. Set `Repository Path` to the repository that owns your worktrees, for example `/Users/you/src/github.com/org/repo`.
4. Set `Map Value` to the name used under the worktree directory. If you leave it empty, the repository folder name is used.
5. Save the mapping and return to the main list.

After this, Worktree Deck can show worktrees for that repository and connect them with related Codex sessions.

To enable the menu bar command, run `Worktree Status` once from Raycast.

## Configuration

The extension reads configuration from Raycast Preferences > Extensions > Worktree Deck. Change these only if your local paths or session-retention rules differ from the defaults:

- `GIT_WORKTREE_PATH`: Directory where Worktree Deck creates and scans git worktrees. Default: `~/.worktree-deck/worktrees`.
- `CODEX_HOME`: Codex home directory. Default: `~/.codex`.
- `WORKTREE_DECK_SEARCH_DAYS`: Number of days to search for Codex sessions.
- `WORKTREE_DECK_DONE_THRESHOLD_DAYS`: Number of days after which a working session is treated as done.

Repository mappings, job state, preferred editor settings, and related local state are stored in `~/.worktree-deck/storage`.

## Requirements

- Raycast
- Git, for worktree listing and worktree operations
- Codex CLI, when using Auto Start or Codex App actions
- GitHub CLI (`gh`), when creating pull requests
- Zed, VS Code, or Cursor, only when opening a worktree in that IDE

Missing optional tools are reported when you use the related action. The main worktree list does not require `gh` or an IDE to be installed.

## Development

```sh
npm install
```

```sh
npm run dev
```

Use Raycast Preferences > Extensions > Worktree Deck to adjust local development paths when needed.

## Privacy

Worktree Deck reads local git worktree metadata and local Codex session files from the paths you configure. It does not send this data to an external service.

## License

MIT
