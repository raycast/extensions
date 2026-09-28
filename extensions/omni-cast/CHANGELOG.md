# OmniCast Changelog

## [Reset and Store Review Fixes] - {PR_MERGE_DATE}

- Prepare floating and native-full-screen windows for tiling in both Reset commands.
- Separate the focused window from a shared column before resetting its size.
- Use the System category and correct the Move Up command title.

## [OmniWM 0.6.4 Compatibility] - {PR_MERGE_DATE}

- Add commands for all ten numbered scratchpad slots.
- Recognize plain-text protocol and transport failures from `omniwmctl` and
  show actionable recovery guidance.

## [IPC Error Guidance] - {PR_MERGE_DATE}

- Explain how to recover when an OmniWM update resets and disables IPC.
- Surface actionable OmniWM transport and protocol errors in the Raycast HUD.

## [Initial Release] - {PR_MERGE_DATE}

- Search and run OmniWM commands from Raycast using plain English.
- Resize, arrange, move, and reset tiled windows and columns.
- Switch directly between OmniWM workspaces.
- Expose common layout actions as first-class Raycast commands with short aliases.
- Recover floating and native-full-screen windows before applying tiled layouts.
