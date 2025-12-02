# Try

Manage ephemeral workspace directories for your experiments, directly from Raycast.

A Raycast port of [try](https://github.com/tobi/try) by [@tobi](https://github.com/tobi).

## Features

- **Browse** all your experiment directories with instant search
- **Create** new directories with auto date prefix (YYYY-MM-DD-name)
- **Clone** git repositories into organized directories
- **Smart sorting** - recently used directories appear first
- **Configurable path** - set your own try directory location

## Usage

### Browse Directories

Open Raycast and search for "Browse Try Directories" to see all your experiments.

### Create New Directory

Press `⌘+N` to create a new directory. It will be automatically prefixed with today's date.

### Clone Repository

Press `⌘+G` to clone a git repository. Supports:

- `https://github.com/user/repo`
- `git@github.com:user/repo`
- GitLab and other git hosts

### Actions

- **Open With** - Open directory with default app (updates last accessed time)
- **Show in Finder** - Reveal in Finder
- **Copy Path** - Copy directory path to clipboard
- **Delete** - Remove directory (with confirmation)

## Configuration

Set your try directory path in Raycast extension preferences:

1. Open Raycast Preferences
2. Go to Extensions → Try
3. Set "Try Directory Path" (default: `~/src/tries`)

## Credits

This is a Raycast port of [try](https://github.com/tobi/try) by [@tobi](https://github.com/tobi).

The directory structure, naming conventions (YYYY-MM-DD prefix), and core functionality are directly adapted from the original Ruby CLI tool. This extension reimplements a subset of those features in TypeScript for Raycast.

**Recommended**: Install the original [try CLI](https://github.com/tobi/try) for the full feature set (fuzzy search in terminal, worktree support, etc.).

## License

MIT
