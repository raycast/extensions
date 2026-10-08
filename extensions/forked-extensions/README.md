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

### "Why does my `.git` folder keep growing after opening the repository in an editor?"

The `tree:0` partial clone filter postpones downloading file contents and directory trees; it does not prevent Git from downloading them when a command needs them. Sparse checkout limits the files in your working directory, not the history that Git can request. Automatic blame and file-history queries from editors or Git extensions can therefore trigger substantial background downloads, even when you only work on one extension. See GitHub's [explanation of treeless clones](https://github.blog/open-source/git/get-up-to-speed-with-partial-clone-and-shallow-clone/).

For VS Code and VS Code Insiders, open **Preferences: Open Workspace Settings (JSON)** and add these settings to the existing configuration to disable built-in automatic blame:

```json
{
  "git.blame.editorDecoration.enabled": false,
  "git.blame.statusBarItem.enabled": false
}
```

If you use GitLens, choose **Disable (Workspace)** from its extension menu to prevent its automatic history queries in this workspace. Disabling only inline annotations may leave other blame features active. Check other Git extensions for similar features, then run **Developer: Reload Window**. Apply this in each editor/workspace that opens the repository; workspace settings do not affect your other projects.

Manually running `git blame` or querying a file's history can still download missing objects. Changing editor settings does not remove objects already downloaded. If downloads continue after closing or reloading the editor, check for leftover Git processes before using the cleanup action described below.

### "I used this extension to convert an existing full-checkout repository to sparse-checkout but my `.git` folder still has a massive size"

New repositories created or reconfigured by this extension use the `tree:0` partial clone filter, disable automatic tag downloads, and only track `upstream/main` by default to keep future fetches smaller.

To clean up an existing repository, open the "Manage Forked Extensions" command and choose "Clean Up Repository". After confirmation, the action runs `git maintenance run --task=gc` in the foreground and reports the pack count and packed size before and after it finishes. It does not install or schedule background maintenance.

Git maintenance can consolidate pack files and reclaim unreachable objects, but it cannot remove objects that are still reachable from your repository's branches, tags, or other references. If your `.git` folder remains very large after cleanup, we recommend starting fresh with a new clone.

## License

MIT
