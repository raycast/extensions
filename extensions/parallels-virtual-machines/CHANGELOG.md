# Parallels Virtual Machines Changelog

## [Reliable VM Switching] - {PR_MERGE_DATE}

- Open, start, resume, or switch to a VM through one consistent action.
- Identify VMs by UUID so renames and duplicate names cannot open the wrong VM.
- Switch to a running VM on another macOS Space by activating its regular Parallels Dock Helper.
- Add a direct command that accepts a VM name or UUID.

## [New Commands] - 2025-11-07

- Improve action panel by removing duplicate commands.
- Improve OS icon matching when viewing list of VMs.
- Add `Force Stop` and `Reset` actions for running VMs.
- Add `Start then Force Stop` action for suspended VMs.
- Add Shut Down command to correctly shut down Parallels and services.
- Add icons to VM control actions in action panel.

## [Update] - 2024-01-05

- Added error handling for when AppleScript can't launch VM.
- Updated Raycast API version and dependencies.

## [Initial Version] - 2022-09-17

- Listing of virtual machines.
- Open, resume, and suspend actions.
