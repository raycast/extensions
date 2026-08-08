# Portreaper Changelog

## [Initial Version] - {PR_MERGE_DATE}

- List every process listening on a TCP port, plus **orphaned dev processes that hold no port at all** (an `electron-vite` main process left behind when its parent `node` was killed is invisible to a port scan, but is exactly the kind of residue worth reaping)
- Zombie-suspect classification with confidence tiers (`confirmed` / `likely` / `possible`) and the evidence behind each verdict
- Terminate or force-kill a process, with PID-reuse protection: the engine re-checks the process creation time before killing, so a recycled PID can never be hit by mistake
- Star a process to exempt it from suspicion — the whitelist is the same file the desktop app uses, so stars cross over in both directions
- Detail panel showing the launcher chain, subtree CPU (a headless browser burns CPU in child processes while its main process reads ~0%), memory, and uptime
- The classification engine is downloaded from the project's GitHub release on first run and verified against its published SHA-256 checksum
