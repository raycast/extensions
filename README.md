# Reboot to BIOS

Quickly reboot your Windows PC directly to BIOS firmware settings with a single command.

## Features

- **One-click reboot**: Execute directly from Raycast
- **Silent operation**: No command windows or UI dialogs
- **Admin handling**: Automatically requests admin privileges when needed

## Requirements

- **Windows OS only**
- **Administrator privileges**: Windows will prompt for admin access when you run the command

## Usage

1. Open Raycast
2. Search for "Reboot to BIOS"
3. Press Enter
4. Approve the admin prompt (UAC)
5. Your PC will restart to BIOS firmware settings

## Technical Details

This extension uses Windows' built-in `shutdown` command with the `/fw` flag to reboot directly to BIOS firmware settings:
- Command: `shutdown /r /fw /t 0`

The command is executed via a batch file that minimizes itself to ensure silent operation.
