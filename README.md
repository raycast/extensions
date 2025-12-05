# Reboot to BIOS

Quickly reboot your Windows PC directly to BIOS/UEFI firmware settings with a single command.

## Features

- **One-click reboot**: Execute directly from Raycast
- **Cancel Reboot command**: Quickly cancel any pending reboot
- **Configurable delay**: Choose 0-10 seconds; gives time to cancel
- **UEFI detection**: Automatically checks if your system supports firmware boot
- **Optional confirmation**: Can be disabled for instant hotkey execution

## Requirements

- **Windows OS only**
- **UEFI firmware**: Your system must boot in UEFI mode (not legacy BIOS)

## Usage

1. Open Raycast
2. Search for "Reboot to BIOS"
3. Press Enter
4. Confirm the reboot dialog (can be disabled in preferences)
5. Your PC will restart to UEFI firmware settings

**To cancel**: Use the "Cancel Reboot" command in Raycast, or run `shutdown /a` in any command prompt.

> 💡 **Tip**: Assign a hotkey to "Cancel Reboot" in Raycast preferences for quick access.

## Compatibility

This extension requires **UEFI firmware**. It will show a helpful error message if:

- Your system uses **legacy BIOS** instead of UEFI
- Windows was installed in **legacy/CSM mode** even on UEFI hardware
- You're running in a **virtual machine** that doesn't support firmware boot

**Alternative methods if the extension doesn't work:**

1. **Shift+Restart**: Start Menu → Power → Hold **Shift** and click "Restart" → Troubleshoot → Advanced options → UEFI Firmware Settings
2. **Boot key**: Restart and press **F2**, **Del**, or your manufacturer's BIOS key during startup

## Technical Details

Uses Windows Task Scheduler to execute the shutdown command with elevated privileges:

```
shutdown /r /fw /t 10
```

- `/r` - Restart the computer
- `/fw` - Boot to firmware (UEFI) settings on next restart
- `/t 10` - Wait 10 seconds before restarting
