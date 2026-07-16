# SSH Image Drop Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Send clipboard images and Finder-selected files to servers over SSH
- Pull a remote file (path taken from the clipboard) back into Finder
- Password stored in the macOS Keychain by default; optional SSH key auth (`ssh-copy-id`)
- Per-server Quicklinks for instant, target-addressed sends
- Security hardening: remote path/filename validation (rejects shell metacharacters and `..` segments), atomic symlink-safe `~/.ssh` config writes, isolated 0700 temp directories for clipboard captures, and runtime input re-validation at transfer entry points
- Documented threat model: Keychain ACL trade-off, shared passphrase-less key, and first-connection (TOFU) host-key trust
