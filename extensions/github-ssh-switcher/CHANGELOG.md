# Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Added

- List view showing all configured GitHub accounts with SSH host alias as accessory
- Three-step switch flow: clear SSH agent → load private key → test GitHub authentication
- Animated toast feedback during switch execution
- Error detail view showing step-by-step output when a switch fails
- Automatic resolution of `SSH_AUTH_SOCK` via `launchctl` when Raycast does not inherit it from the shell (macOS)
- Cross-platform PATH resolution for `ssh` and `ssh-add` (macOS and Windows)
