# SSH Image Drop Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Send files, folders, and clipboard images to servers over SSH — file sends use a one-screen picker form, pre-filled from your Finder selection on macOS
- Pull a remote file (path taken from the clipboard) back into Finder
- Windows support: clipboard push/pull, file/folder sends, and server management (password or SSH key) — passwords are stored DPAPI-encrypted; remote servers must run macOS/Linux
- Animated progress toast on every transfer, with per-item counts (`Sending 2/5…`) for multi-file sends
- Password stored in the OS credential store (macOS Keychain / Windows DPAPI) by default; optional SSH key auth
- Per-server Quicklinks for instant, target-addressed sends
- Manage Servers command: one place to add, edit, and delete registered servers
- Security hardening: remote path/filename validation (rejects shell metacharacters and `..` segments), atomic symlink-safe `~/.ssh` config writes, isolated 0700 temp directories for clipboard captures, and runtime input re-validation at transfer entry points
- Documented threat model: Keychain ACL trade-off, shared passphrase-less key, and first-connection (TOFU) host-key trust
