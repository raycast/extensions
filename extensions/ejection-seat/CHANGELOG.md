# Ejection Seat Changelog

## [Whole-Disk Scans] - 2026-10-05

- Hide system helper volumes mounted `nobrowse` — such as `Recovery` on the internal disk and an external boot disk's `Preboot` — matching what Finder shows
- Scan every volume on the same physical disk, hidden ones included, because `diskutil eject` ejects them together; the volume list marks volumes that share a disk
- Confirm the volume has actually unmounted before reporting an eject as successful
- The volume list and the blocker list now show the same scan, so a count on the list matches what you find inside
- Spotlight and other system services are tagged by name instead of counted as likely blockers
- A volume on the same disk that cannot be scanned no longer hides the selected volume's results; it is listed under Not Scanned
- A volume that stops responding no longer stalls a refresh or an eject
- A volume that is unplugged while you look at it leaves the list, and an open blocker list closes and says so, instead of showing a failed scan
- Rename the "Open Eject All Disks" action to "Eject All Disks"
- Replace "Toggle Details" with "Hide Sidebar" / "Show Sidebar" on ⌘⇧D, and remember the choice across launches
- Note how Ejection Seat complements Eject All Disks, which names the disks it could not eject since [Raycast 2.6.0](https://www.raycast.com/changelog/macos/2-6)

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
