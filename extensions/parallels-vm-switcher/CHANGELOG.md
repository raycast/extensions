# Parallels VM Switcher Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Open, start, resume, or switch to a VM through one consistent action.
- Identify VMs by UUID, follow renames, and reject duplicate registered names instead of risking the wrong VM window.
- Switch to a running VM on another macOS Space through its UUID-specific Parallels Dock Helper.
- Raise and focus the exact target VM window after the Space transition, including multi-display setups with another Parallels window focused.
- Verify the same target window is onscreen and stably owns keyboard and menu-bar focus before reporting success.
- Use direct AppKit activation because an accepted cooperative request may still do nothing, then retry once if the exact target does not stabilize.
- Add a direct command that accepts a VM name or UUID.
