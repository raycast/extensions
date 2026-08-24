# Reponizer

Reponizer keeps a large, structured git repository folder organized. It works with the `host/owner/repo` layout used by [git-get](https://github.com/grdl/git-get) and [ghq](https://github.com/x-motemen/ghq) — for example `~/repos/github.com/lonetis/reponizer` — and turns Raycast into a fast overview, health check, and toolbox for every repository you have cloned locally.

## Features

- **Hierarchical overview** — all repositories grouped by host and owner, instantly searchable
- **Repo status at a glance** — branch, ahead/behind counts, uncommitted changes, merge conflicts, stashes, and size on disk
- **Remote auditing** — flags repos whose `origin` does not match their location (and repos without any remote), with one-key auto-fix, folder relocation, and duplicate detection
- **Remote management** — add, edit, rename, and delete remotes; switch any remote between SSH and HTTPS
- **Host aliases** — keep short folder names like `buw` for long hosts like `git.uni-wuppertal.de`; auditing, cloning, and relocation all understand the mapping
- **Host-only comparison** — for hosts with opaque repo paths (e.g. Overleaf project IDs), only the host is audited so you can name the folders yourself
- **Clone into structure** — paste any git URL (or a bare `github.com/owner/repo` path) and it lands in the right folder, keeping the protocol you pasted
- **Fetch / Pull everything** — bulk fetch and safe fast-forward pulls with progress and a failure report
- **Offload local copies** — verify a repo is fully pushed, then free its disk space while keeping a placeholder; re-download it anytime
- **Export / import** — mirror your repository list across machines via a JSON file or the Raycast-synced snapshot
- **Menu bar health check** *(optional)* — a quiet counter of repositories that need attention
- **Quick actions** — open in your editor, terminal, Finder, or on the remote host's website; copy paths and URLs; move repos to the Trash

## Setup

Reponizer works out of the box if your repositories live in `~/repos` in a `host/owner/repo` layout. Otherwise, open any Reponizer command, press `⌘ ,`, and set the **Repositories Root**.

### Preferences

- **Repositories Root** — the folder containing all repos (default `~/repos`)
- **Default Protocol** — SSH (default) or HTTPS; used for suggested origin URLs and bare-path clones
- **Max Scan Depth** — how deep to search below the root (increase for GitLab subgroups)
- **Network Concurrency** — how many repos Fetch All / Pull All sync at once (default 4); raise it to finish faster, lower it if your SSH agent (e.g. 1Password) struggles with parallel connections
- **Host Aliases** — comma-separated `alias=host` pairs mapping a folder name to the real remote host, e.g. `buw=git.uni-wuppertal.de, overleaf.com=git.overleaf.com`
- **Host-Only Comparison** — comma-separated hosts (alias or real host) whose repos are audited by host only, so the folder layout below them is up to you
- **Editor / Terminal** — the apps used by the open actions; besides Terminal.app and iTerm2, terminals like kitty, Alacritty, WezTerm, Ghostty, and Warp open directly in the repository folder

## Commands

| Command | What it does |
| --- | --- |
| **Search Repositories** | The main overview: browse, search, filter, and manage everything |
| **Clone Repository** | Clone a URL into the correct place in the folder structure |
| **Fetch All / Pull All Repositories** | Bulk sync; pulls are fast-forward only and skip dirty repos |
| **Export / Import Repository List** | Mirror the repo list across machines |
| **Repository Health** | Menu bar overview (disabled by default; enable it in Raycast settings) |

## Tips

- Press `⌘ I` on any repository to toggle a detail panel with remotes, sync state, and sizes.
- The list opens instantly from cache and rescans in the background; `⌘ R` forces a rescan, `⌥⌘ R` also recomputes folder sizes.
- **Offloading**: Reponizer refuses to offload a repo with unpushed branches, uncommitted changes, untracked files, or stashes — nothing is ever lost. The freed folder keeps a small `reponizer-offloaded.json` placeholder so you (and the import command) know what belongs there.
- **Importing on a fresh machine**: choose *Create Offloaded Placeholders* to mirror the whole structure without downloading anything, then restore repos on demand.

## Troubleshooting

- **SSH authentication fails when fetching or cloning**: Raycast does not inherit your shell environment. Reponizer automatically falls back to the 1Password SSH agent socket if `SSH_AUTH_SOCK` is unset; for other agent setups, configure the agent in `~/.ssh/config` (e.g. via `IdentityAgent`).
- **Repos are missing from the list**: they may be deeper than the configured scan depth, or inside a hidden folder — both are skipped.

## Contributing

Bug reports and pull requests are welcome at [github.com/lonetis/reponizer](https://github.com/lonetis/reponizer).

## License

MIT
