# Set Audio Device

Switch the active audio input/output device on your Mac, control volume, and enforce device preferences automatically.

## Commands

### Set Output Device / Set Input Device

Browse and switch between audio devices. Each device shows its current volume level, mute state, and any configured tags (Default, Pinned).

**Actions available on each device:**

| Action | Shortcut | Description |
|---|---|---|
| Set as device | Enter | Switch to this device |
| Mute / Unmute | Cmd+M | Toggle mute for the device |
| Pin / Unpin Volume | Cmd+Shift+V | Lock volume at current level |
| Set / Clear Default | Cmd+Shift+D | Mark as your preferred device |
| Move Up / Down | Ctrl+Opt+Arrow | Reorder device priority |
| Move to Top / Bottom | Ctrl+Opt+Shift+Arrow | Jump to top or bottom of priority list |
| Hide / Show Device | — | Remove device from the list |
| Create Quicklink | — | Create a Raycast quicklink to switch to this device |

### Set Output Volume / Set Input Volume

Form-based commands to set the volume of any connected device. Select a device from the dropdown and enter a volume level (0-100).

### Enforce Output Device / Enforce Input Device

Background commands that run every 20 seconds. They automatically:

- Switch to your **default device** when it's connected
- Fall back to the highest-priority device if the default is unavailable
- Reset **pinned volumes** if macOS changes them (common after Bluetooth reconnects or sleep)

No manual toggle needed -- set a default device or pin a volume, and enforcement just works.

### Combo 1 / 2 / 3

Switch input and output devices simultaneously. Useful for switching between setups (e.g., "desk" vs "meeting" vs "headphones"). Disabled by default; enable in Raycast preferences.

### Set Output Device to Favourite / Toggle Favourites

Legacy quick-switch commands. Disabled by default.

## How default device + priority works

1. Open "Set Output Device" or "Set Input Device"
2. Select a device and press Cmd+Shift+D to set it as default
3. The default device gets a blue "Default" tag and is pinned to the top of the list
4. Every 20 seconds, the background enforcer checks if the default device is connected and switches to it
5. If the default device is disconnected, the enforcer uses the priority order (topmost connected device wins)
6. Reorder non-default devices with Ctrl+Opt+Arrow to set fallback priority

## How pinned volumes work

1. Select a device and press Cmd+Shift+V to pin its current volume
2. The device gets an orange "Pinned: X%" tag
3. Every 20 seconds, the enforcer checks if the volume has drifted and resets it
4. Press Cmd+Shift+V again to unpin
