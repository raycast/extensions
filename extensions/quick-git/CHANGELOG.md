# Quick Git Changelog

## [Smoother repo selection] - 2025-08-18

Updated how repos are selected so that it is quicker to change between them.

- Added a new extension preference for selecting a directory to look for repos
- Updated the repo selection screen
- Updated git status parsing to be a bit more robust, and now displays how much files have changes

## [Diffs and deletes] - 2025-06-16

View the diff for a file that you have changed, and make it easier to delete and push branches.

- Show and hide file diffs
- Add `Open With…` action
- If the `Delete Branch` action fails you can now try and hard delete it
- If the `Push Branch` action fails you can now force push it (with lease)
- Refactor various parts of extension

## [Initial version] - 2025-06-10

Select a git repository and display a list of changed files, along with some information about the current branch.

- Check status of the repo
- Stage and unstage changes, you can do this to all files at once or individually
- Commit the currently staged changes
- Discard changes and restore a file to its previous state
- Push, pull and fetch a branch
- Stash all unstaged files
- Open or copy a file
- Create, delete and switch branches
