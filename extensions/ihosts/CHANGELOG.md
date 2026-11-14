# iHosts Changelog

## [Hosts Access and Update Fixes] - {PR_MERGE_DATE}

- Enable hosts editing through the macOS administrator authentication dialog with an account-specific access grant and restrictive standard file permissions.
- Repair older hosts permissions, handle authorization cancellation, and verify access before continuing.
- Write hosts directly without temporary shell commands and preserve shorter or Unicode content correctly.
- Keep saved hosts when the cache is empty and wait for remote hosts before applying menu-bar changes.
- Add regression tests for permissions, writes, command transitions, and remote-update ordering.

## [Support Remote Host] - 2025-04-15

- support fetch remote hosts
- add command `update remote hosts quickly`, quick update remote hosts

## [Optimize Experience] - 2022-11-28

## [Optimization] - 2022-10-12

Make `sys-host-prem.png` to local

## [Update README & Command keywords] - 2022-10-11

Update README & Command keywords

## [Added iHosts] - 2022-09-06

Initial version code
