# Tinker for Raycast

Control Tinker from Raycast. Record a selected area, repeat your last capture area, or copy your latest recording without reaching for the menu bar.

## Requirements

Requires Tinker 0.4.0 or later for macOS. Complete Tinker's onboarding and grant Screen Recording permission before using recording commands. Copying the latest recording does not require Screen Recording permission.

## Setup

1. Install and open Tinker.
2. Complete onboarding and grant Screen Recording permission.
3. Install the Tinker extension from the Raycast Store.
4. Assign Raycast hotkeys to the commands you use most.

## Commands

- **Record Area** opens Tinker's area-selection flow.
- **Record Last Area** records the last area selected manually in Tinker. The original display must still be connected.
- **Copy Latest Recording** copies the newest recording in Tinker's archive to the clipboard.

Raycast sends each request to the Tinker app. Recording-command status appears in Tinker. Copy Latest Recording reports confirmed clipboard success or an actionable failure in Raycast.
