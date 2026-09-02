# Portreaper Changelog

## [Initial Version] - 2026-08-31

- List every process listening on a TCP port, plus **orphaned dev processes that hold no port at all** (an `electron-vite` main process left behind when its parent `node` was killed is invisible to a port scan, but is exactly the kind of residue worth reaping)
- Zombie-suspect classification with confidence tiers (`confirmed` / `likely` / `possible`) and the evidence behind each verdict
- Terminate or force-kill a process, with PID-reuse protection: the engine re-checks the process creation time before killing, so a recycled PID can never be hit by mistake
- Star a process to exempt it from suspicion — the whitelist is the same file the desktop app uses, so stars cross over in both directions
- Terminating confirms the target actually exited instead of reporting success as soon as the signal was delivered; if it is still there, the toast says so and offers Force Kill
- Suspended processes (Ctrl-Z, or a background job touching the terminal) are labeled as such — a caught terminate signal stays pending until they resume, so the engine wakes them up right after sending one
- Filter by verdict from the search bar, and see confirmed / likely / possible as separate sections
- Detail panel showing the launcher chain, process state, subtree CPU (a headless browser burns CPU in child processes while its main process reads ~0%), memory, and uptime
- Open a listening port in the browser, reveal the executable in Finder, and copy the PID, command, path, or the engine's full verdict as JSON
- The classification engine is downloaded from the project's GitHub release on first run and verified against its published SHA-256 checksum
