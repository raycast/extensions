# Pods Control

Control AirPods and Beats listening modes (Off, Transparency, Adaptive, Noise Cancellation) and Conversation Awareness from Raycast.

## Requirements

- macOS. The extension does not run on other platforms.
- AirPods, or Beats headphones that expose these controls in macOS. See the [compatibility matrix](https://github.com/raulgg/pods-control/blob/HEAD/docs/compatibility.md) for tested models.
- The [pods-control CLI](https://github.com/raulgg/pods-control), version 0.5.0 or later. The extension uses it to talk to your device.

## Get started

1. Connect your AirPods or Beats to your Mac.
2. Run **Manage CLI** and follow its steps to install the CLI. It checks for Homebrew and Apple's developer tools first.
3. In Raycast's extension settings, turn on the optional commands and enable the desired listening modes to use in **Cycle Listening Mode**.
4. Assign hotkeys to the commands you use most, for example **Cycle Listening Mode**.

## Commands

| Command                           | What it does                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Set to Noise Cancellation**     | Switch to Noise Cancellation.                                                                             |
| **Set to Transparency**           | Switch to Transparency.                                                                                   |
| **Set to Adaptive**               | Switch to Adaptive. Disabled by default.                                                                  |
| **Set to Off**                    | Turn noise control off. Disabled by default.                                                              |
| **Cycle Listening Mode**          | Step through the listening modes you enable in its preferences. Skips modes your device does not support. |
| **Toggle Conversation Awareness** | Turn Conversation Awareness on or off. Requires a model that supports it.                                 |
| **Pods Status**                   | Refresh the subtitles with the confirmed listening mode and Conversation Awareness.                       |
| **Manage CLI**                    | Install, update, or repair the CLI. Each screen explains the next step and offers the action.             |

Control commands show a success toast while Raycast is open and a HUD when it is closed, for example when you use a hotkey.

### Turn on Set to Adaptive and Set to Off

Both commands are disabled by default because not every device supports them. If yours does, enable the command in Raycast's extension settings.

- **Set to Adaptive** needs a model that supports Adaptive.
- **Set to Off** needs Off Listening Mode turned on in your device settings.

### See the current state at a glance

**Cycle Listening Mode**, **Toggle Conversation Awareness**, and **Pods Status** show the current state, as confirmed by macOS, in their subtitles. Run **Pods Status** once to turn on Background Refresh, which updates these subtitles every minute. They also update after macOS confirms a change you make. The other commands keep the subtitle "Pods Control".

## Preferences

| Preference                 | Command              | Description                                                                                                                        |
| -------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **CLI Path**               | Extension            | Full path to the `pods-control` binary. Leave it empty to detect the CLI automatically. A set path overrides detection.            |
| **Modes to Cycle Through** | Cycle Listening Mode | Checkboxes for Off, Transparency, Adaptive, and Noise Cancellation. Enable at least two. Off and Adaptive are disabled by default. |

## Troubleshooting

### "CLI not found" after installing

Open **Manage CLI**. It detects unlinked or incomplete Homebrew installs and an invalid **CLI Path**, and shows the command or preference that fixes each one. After you follow the steps, choose **Refresh** in that view and run your command again.

### "Not connected"

**Pods Status** shows **Not connected** when no AirPods or Beats are connected. Connect your device to your Mac. If several compatible devices are connected, disconnect the others. The extension does not choose between devices.

### Adaptive or Conversation Awareness is not supported

Both depend on your model and firmware. Check the [compatibility matrix](https://github.com/raulgg/pods-control/blob/HEAD/docs/compatibility.md). For Adaptive, turn on **Set to Adaptive**, enable it in **Modes to Cycle Through**, or do both.

### "Off was not set"

macOS did not switch your device to Off. Your device offers Off only when its Off Listening Mode setting is on.

1. Open your AirPods or Beats settings on your Mac and turn on Off Listening Mode.
2. Turn on **Set to Off** in Raycast's extension settings, enable Off in **Modes to Cycle Through**, or do both.

The CLI caches whether Off Listening Mode is on. See its [note on cached Off availability](https://github.com/raulgg/pods-control/blob/HEAD/docs/cli.md#cached-allow-off-availability).

If you don't want to use Off, disable it in **Modes to Cycle Through** and disable **Set to Off**.

### Commands stopped working after a macOS update

Check the compatibility matrix. Then update the CLI from **Manage CLI** or with `brew upgrade raulgg/tap/pods-control`. A successful install does not confirm that your device is supported.

## Report a bug

Open an issue in the [extension repository](https://github.com/raulgg/raycast-extension-pods-control/issues). If you know the problem is in the CLI or with your device, report it in the [pods-control CLI repository](https://github.com/raulgg/pods-control/issues) instead. When a command fails, choose **Copy Error** on its toast and paste the message into your report.

## Privacy and security

The extension only runs the CLI on your Mac and collects no analytics. The CLI uses private macOS audio interfaces and a companion library that adjusts an entitlement check inside its own process. It does not need Accessibility permission or elevated privileges. Apple can change these interfaces in any macOS update. Read the CLI's [security and trust model](https://github.com/raulgg/pods-control/blob/HEAD/SECURITY.md) before you install it. The CLI keeps a small local cache, described in its [reference](https://github.com/raulgg/pods-control/blob/HEAD/docs/cli.md#cached-allow-off-availability).
