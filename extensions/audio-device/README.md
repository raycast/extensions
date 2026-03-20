# Set Audio Device

Switch audio devices, lock volumes, and stop macOS from changing your sound settings after sleep or Bluetooth reconnects.

## What you can do

**Switch devices.** Open "Set Output Device" or "Set Input Device". Press Enter to switch. The window stays open so you can keep working.

**Lock a device in place.** Press Cmd+Shift+D on any device to make it your default. If macOS switches away (after sleep, Bluetooth reconnect, plugging in a monitor), the extension switches back within 10 seconds. Manually switching gives you a 1-minute grace period before enforcement resumes.

**Lock a volume level.** Press Cmd+Shift+V on any device to pin its volume. If macOS resets it, the extension restores it within 10 seconds. Changes under 2% are ignored so minor system adjustments don't trigger a reset.

**See volume levels.** Each device shows its current volume percentage. HDMI/DisplayPort devices that don't support software volume control show "Volume controlled by device".

**Mute/unmute.** Press Cmd+M on any device that supports mute.

**Set exact volume.** "Set Output Volume" and "Set Input Volume" commands let you enter a specific volume (0-100) and optionally pin it.

**Switch entire setups at once.** Combo commands let you switch input and output together — e.g., "desk" vs "meeting" vs "headphones". Disabled by default; enable in Raycast preferences.

## Commands

| Command | What it does |
|---|---|
| Set Output Device | Browse and switch output devices |
| Set Input Device | Browse and switch input devices |
| Set Output Volume | Set volume for any output device (0-100) |
| Set Input Volume | Set volume for any input device (0-100) |
| Enforce Output Device | Runs in background. Keeps your default output device and pinned volumes in place. |
| Enforce Input Device | Runs in background. Keeps your default input device and pinned volumes in place. |
| Combo 1 / 2 / 3 | Switch input + output together. Disabled by default. |

## Keyboard shortcuts (in device list)

| Shortcut | Action |
|---|---|
| Enter | Switch to device |
| Cmd+M | Mute / Unmute |
| Cmd+Shift+D | Set or clear default device |
| Cmd+Shift+V | Pin or unpin volume |

## How enforcement works

The enforce commands run silently every 10 seconds. They check two things:

1. **Default device** — if your default device is connected but not active, switch to it. Skipped for 1 minute after a manual switch so you can temporarily use another device.
2. **Pinned volumes** — if a pinned volume has drifted by 2% or more, reset it.

If neither is configured, the commands do nothing.
