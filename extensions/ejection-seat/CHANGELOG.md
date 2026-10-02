# Ejection Seat Changelog

## [Initial Version] - 2026-08-29

- Find the processes and open files that may prevent a volume from ejecting
- Scan every mount under `/Volumes` up front, with a per-volume blocker count
- Group references into Likely Blockers, Other References, and System Services, ranked by how strongly each reference holds the volume
- Detail pane showing the owning application, PID, user, and every referenced path, collapsible when you only want the list
- Service-specific advice for Quick Look, Spotlight indexing, `fseventsd`, `revisiond`, and Time Machine
- Activate or politely quit the app holding a file, reveal a referenced path in Finder, or copy the paths
- Eject the volume with `diskutil eject` — never a forced unmount
- Surface the process named by Disk Arbitration when an eject is refused, with a shortcut to activate it, without leaving the blocker list
- State plainly that root-owned open files are invisible to an unprivileged scan, so an empty result is never read as "this volume is clear"
