# SMB Share Mounter Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Add, edit, remove, connect, and unmount individual SMB server entries (host, share/path, optional alias, optional username) from the **Add SMB Server** and **Manage SMB Servers** commands, which also tag entries as **Connected** when currently mounted.
- Mount all saved, reachable shares at once with **Mount SMB Shares**, and unmount all connected ones at once with **Unmount SMB Shares**.
- Each host is checked on SMB port 445 before mounting, with unreachable hosts reported separately from mount failures.
- Shares are mounted via `open smb://...`, matching Finder's own "Connect to Server" behavior.
