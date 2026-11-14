# Vehicle Motion Cues

Control Apple's built-in Vehicle Motion Cues from Raycast without opening System
Settings. Assign a hotkey to toggle the cues while riding as a passenger.

![Raycast confirms Vehicle Motion Cues is on](docs/confirmation.png)

## Commands

- **Toggle Vehicle Motion Cues** — switch the cues on or off.
- **Turn On Vehicle Motion Cues** — enable the cues, including when they are already on.
- **Turn Off Vehicle Motion Cues** — disable the cues, including when they are already off.

The command confirms the resulting setting in a HUD. Your dot appearance settings
are preserved. Assign a hotkey or alias in Raycast Settings to any command.

## Requirements

- macOS Tahoe 26 or later, on a Mac that supports Apple's Vehicle Motion Cues.
- No additional application, compiler, downloaded executable, account, or permission setup.

macOS checks whether your hardware supports the feature before changing anything.
The extension reports an error on unsupported hardware. This does not add Vehicle
Motion Cues to Macs that do not support it.

Apple lists the feature as available on supported Mac laptops, excluding MacBook
Neo, MacBook Air (M1), and 13-inch MacBook Pro (M1) or earlier. See Apple's current
[Motion settings documentation](https://support.apple.com/guide/mac-help/mchla3c4f1da/mac)
for availability. Apple advises using the feature as a passenger, not while driving.

## How it works

This extension uses macOS's built-in `/usr/bin/osascript` JavaScript runtime to
call the system's private motion-cue control. It does not automate the Settings UI
or send Apple Events to another application. It uses the same native mode setter
imported by Accessibility Settings, then checks the saved setting in a fresh
process before reporting success.

All helper source is included in `assets/motion-cues.js`. There are no bundled
binaries, network requests, analytics, background services, or local state storage.
The extension only changes the Vehicle Motion Cues mode.

**Compatibility:** the control and support check are private macOS interfaces.
A future macOS release may change them. macOS 27.0.1 on Apple silicon is the tested
configuration; macOS 26 and other supported hardware have not been tested directly.

## Troubleshooting

If the command reports an error, use **Open Accessibility Settings** from the error
toast. Check that the feature is available in your Mac's Motion settings. On older
macOS versions, check the Display section under Accessibility. If a macOS update
changes the private interface, the extension may require an update.
