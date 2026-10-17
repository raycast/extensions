# Symlinks Manager Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Add `Create Symlink` command to create a symbolic link to a file or folder.
- Add `List Symlinks` command to see whether each link is valid, broken, missing or replaced, and to open, copy or delete it.
- Links are created without running shell commands, and the extension only ever replaces or deletes its own symlinks, never a real file or folder.
