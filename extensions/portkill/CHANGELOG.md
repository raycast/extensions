# PortKill Changelog

## [Initial Version] - {PR_MERGE_DATE}

- List listening TCP ports with process name, PID, and endpoint details
- Kill a single process or every unique PID in the list
- **Open in Browser** action and clickable localhost link in the detail pane
  to launch `http://localhost:<port>` in the user's default browser
- Copy URL action for the listener's `http://localhost:<port>` URL
- Cross-platform scanning and process termination on macOS, Windows, and Linux
- Cross-platform keyboard shortcuts (`Refresh`, `Kill All`, `Show/Hide Details`,
  `Open in Browser`, `Copy URL`) that bind correctly on both Raycast for macOS
  and Raycast for Windows
- Locale-independent Windows scanning so the extension works on non-English
  Windows installs
