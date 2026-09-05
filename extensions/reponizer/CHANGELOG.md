# Reponizer Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search Repositories: hierarchical overview grouped by host and owner, search, status filters, and a detail panel
- Repo status at a glance: branch, ahead/behind counts, uncommitted changes, merge conflicts, stashes, and size on disk
- Remote auditing: flags repositories whose `origin` does not match their location, repositories without remotes, and duplicates — with one-key fixes for the origin URL or the folder location
- Remote management: add, edit, rename, and delete remotes, and switch any remote between SSH and HTTPS
- Host aliases: map short folder names such as `buw` to real hosts such as `git.uni-wuppertal.de`, honored by auditing, cloning, relocation, and duplicate detection
- Host-only comparison: audit hosts with opaque repository paths (such as Overleaf project IDs) by host identity alone
- Clone Repository: paste any git URL or a bare `github.com/owner/repo` path and it lands in the right folder, keeping the protocol you pasted
- Fetch All and Pull All: bulk sync with progress and a failure report; pulls are fast-forward only and skip repositories that are dirty, detached, or without an upstream
- Configurable network concurrency for bulk sync, for SSH agents that struggle with parallel connections
- Offload local copies: verify a repository is fully pushed, free its disk space, and keep a placeholder to restore it later
- Export and Import Repository List: mirror the repository list across machines via a JSON file or a Raycast-synced snapshot
- Repository Health: optional menu bar overview of repositories that need attention
- Quick actions: open in editor, terminal, Finder, or on the remote host's website; copy paths and URLs; move repositories to the Trash
