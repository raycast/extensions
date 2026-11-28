# Priority Audio Switch

Rank your audio devices once, and Raycast keeps you on the best one that is connected. Pick something else by hand and it stays that way until a device connects or disconnects.

## How it works

Output and input have their own priority lists, up to five devices each. AirPods can be first for sound and last for the microphone.

When a device connects, the extension switches to it if it ranks higher than the one you are using. When the current device disconnects, it moves you to the best one still connected. A manual switch holds until the next connect or disconnect.

macOS likes to grab the microphone of headphones as soon as they connect. With a better mic ranked above them, the extension switches right back.

Devices without a priority are never picked automatically. The exception is Switch on Connect.

Example for output: wireless headphones 1, speakers 2, wired headphones 3. Without the wireless headphones, sound goes to the speakers. Switch to the wired headphones and they stay. Put the wireless headphones on and they take over.

## Switch on Connect

Some devices don't need a fixed rank. You want them the moment they connect: headphones in the jack, AirPods out of the case. A device with Switch on Connect takes over when it connects and stays until the active device changes. After that, the priority lists decide again.

Bluetooth outputs and the headphone jack, including USB-C to 3.5 mm adapters, have it on by default. Inputs don't. Turn it on or off for any device from the device list or in Set Priority….

## Setup

1. Open **Output Device** or **Input Device** and rank your devices with **Set Priority…** or the shortcuts below.
2. Turn on **Background Refresh** for **Enable Auto Switch** in Raycast Settings → Extensions → Priority Audio Switch. The extension reminds you the first time you set a priority.
3. Optional: assign hotkeys to **Cycle Output Device** and **Cycle Input Device**.

Background commands run about once a minute, so the switch can take up to a minute after a device connects. While Output Device or Input Device is open, the list reacts within a couple of seconds.

If Set Audio Device is also installed, turn off its enforce commands so the two extensions don't switch against each other.

## Commands

| Command             | What it does                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Output Device       | Output devices in priority order. Switch, rank, pin volume, mute, customize or hide a device. |
| Input Device        | The same for input devices.                                                                   |
| Enable Auto Switch  | Runs in the background. Applies your priorities and keeps pinned volumes in place.            |
| Cycle Output Device | Switches to the next output device that has a priority or Switch on Connect.                  |
| Cycle Input Device  | Switches to the next input device that has a priority or Switch on Connect.                   |

## Device list

The current device is green and selected when the list opens. On the right you see its rank, a bolt for Switch on Connect, or a dashed circle when it has neither. Ranked devices that are not connected stay in the list, dimmed, so you can still reorder them. A pinned volume shows as an orange badge.

| Shortcut | Action                                   |
| -------- | ---------------------------------------- |
| Enter    | Select device                            |
| ⌘ ⇧ D    | Set as Top Priority                      |
| ⌥ ⌘ ↑    | Raise Priority                           |
| ⌥ ⌘ ↓    | Lower Priority                           |
| ⌘ ⇧ V    | Pin or unpin volume                      |
| ⌘ M      | Mute or unmute                           |
| ⌘ E      | Customize Device (name, icon)            |
| ⌘ ⇧ H    | Hide device (⌘ ⇧ S to show it)           |
| ⌥ ⇧ S    | Show hidden devices (⌥ ⇧ H to hide them) |

Hiding a device removes its priority.

## Requirements

A Mac with Apple silicon. Intel Macs are not supported.

Windows is not supported yet. Support is planned for a later version.

## Credits

Priority Audio Switch is a fork of [Set Audio Device](https://www.raycast.com/benvp/audio-device), created by Benjamin von Polheim (benvp) and contributors: mathieudutour, mike182uk, FezVrasta, rcruzper, thomas, arthur_fontaine, pernielsentikaer, taschaub, cballenar, joshmedeski, joshhayes747, inovvia, mateus_badalotti, pavzagor and alexi.build.

Set Audio Device keeps one default device in place. Priority Audio Switch takes a different approach: it switches devices for you by priority, and you can cycle through them by hand when you need to. The device and volume handling come from the original. Thank you for your work.

Earlier versions used [macos-audio-devices](https://github.com/spotxyz/macos-audio-devices) by George Karagkiaouris (MIT) for device switching; it is now done by a small Swift package in the extension. Icons are from [Tabler Icons](https://tabler.io/icons) by Paweł Kuna (MIT). See `THIRD_PARTY_NOTICES.md` for the license notices.
