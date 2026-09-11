# Forked Extensions

Efficiently manage your forked Raycast extensions using Git sparse-checkout. Explore the full extension catalog, selectively checkout specific extensions, and remove extensions from your forked collection with ease.

## Principles

This extension leverages [Git sparse-checkout](https://git-scm.com/docs/git-sparse-checkout) together with partial clone filters to efficiently manage your forked extensions. Our goal is to eliminate the need for cloning the entire repository, which can exceed 20 GB in size, by only checking out the directories you need and by limiting future fetches to the smallest useful object set. With this extension, you can forgo Ray CLI's commands, allowing you to use Git commands directly and regular [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow) for managing your extensions.

Please note with this extension you no longer need to use Ray CLI's `pull-contributions` and `publish` commands. Just use Git commands or your favorite Git GUI tool to manage your forked extensions.

**This extension is intended for those who want to partially clone [raycast/extensions](https://github.com/raycast/extensions) repository, it provides a convenient way to perform the tedious Git `sparse-checkout` command.
If you are unfamiliar with basic Git concepts, this extension may not be for you.**

## Requirements

- [Git](https://git-scm.com) installed on your system

## Features

- [x] Explore full extension list
- [x] Sparse-checkout an extension
- [x] Remove an extension from forked list
- [x] Synchronizes the forked repository with the upstream repository on local
- [x] Manage sparse-checkout directories via UI
- [x] Clean up and optimize the managed repository via UI

## GitHub Permission Scopes

This extension requires the following [GitHub API permission scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps):

- `public_repo`
  - `api.repositoryExists()` - Checks if the user's forked repository exists
  - `api.getForkedRepository()` - Retrieves the full name of the user's forked repository
  - `api.compareTwoCommits()` - Compares two commits in the user's forked repository
- `workflow`
  - `api.syncFork()` - Syncs the forked repository with the upstream repository on GitHub

## FAQ

### "Can I use Git commands directly?"

You can always open your forked extension folder in the terminal to work with CLI commands directly. We also prepared a [CHEATSHEET.md](https://github.com/raycast/extensions/tree/main/extensions/forked-extensions/CHEATSHEET.md) if you want to learn more about the Git commands used in this extension.

### "How to add or remove a sparse-checkout directory?"

You can add a directory with the `git sparse-checkout add` command. Or use this extension's "Manage Sparse-Checkout" action to add or remove sparse-checkout directories via the UI.

### "I used this extension to convert an existing full-checkout repository to sparse-checkout but my `.git` folder still has a massive size"

New repositories created or reconfigured by this extension use the `tree:0` partial clone filter, disable automatic tag downloads, and only track `upstream/main` by default to keep future fetches smaller.

To clean up an existing repository, open the "Manage Forked Extensions" command and choose "Clean Up Repository". After confirmation, the action runs `git maintenance run --task=gc` in the foreground and reports the pack count and packed size before and after it finishes. It does not install or schedule background maintenance.

Git maintenance can consolidate pack files and reclaim unreachable objects, but it cannot remove objects that are still reachable from your repository's branches, tags, or other references. If your `.git` folder remains very large after cleanup, we recommend starting fresh with a new clone.

## License

MIT
