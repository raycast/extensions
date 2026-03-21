# Forked Extensions

Efficiently manage your forked Raycast extensions using Git sparse-checkout. Explore the full extension catalog, selectively checkout specific extensions, and remove extensions from your forked collection with ease.

## Principles

This extension leverages the [Git sparse-checkout](https://git-scm.com/docs/git-sparse-checkout) feature to efficiently manage your forked extensions. Our goal is to eliminate the need for cloning the entire repository, which can exceed 20 GB in size, by enabling sparse-checkout. With this extension, you can forgo Ray CLI's commands, allowing you to use Git commands directly and regular [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow) for managing your extensions.

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

You might need some manual cleanup to reduce the size of your `.git` folder. Here are a few methods you can take:

- Use [git-gc](https://git-scm.com/docs/git-gc) to clean up unnecessary files and optimize the local repository
- Use [git-fsck](https://git-scm.com/docs/git-fsck) to check the integrity of the repository
- Use [git-prune](https://git-scm.com/docs/git-prune) to remove any objects that are no longer referenced by your branches
- Use [git-maintenance](https://git-scm.com/docs/git-maintenance) to perform various maintenance tasks on your repository

But we recommend using a new clone of the repository to start fresh with a smaller `.git` folder.

## License

MIT
