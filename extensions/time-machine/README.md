# Time Machine


# Version 1.1

Time Machine extension for Raycast. Useful for managing and interacting with Time Machine backups on macOS.
## Features
- Show the status of Time Machine or the most recent backup (requires Full Disk Access)
- Start a Time Machine backup
- Stop an ongoing Time Machine backup
- List available Time Machine backup disks

### Requirements
- macOS with Time Machine enabled
- full disk access for the "Show Status" command to get the most recent backup status (in order to read /Library/Preferences/com.apple.TimeMachine.plist)