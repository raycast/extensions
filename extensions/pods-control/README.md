# Pods Control

Control AirPods and Beats listening modes (Off, Transparency, Adaptive, Noise Cancellation) along with Conversation Awareness from Raycast.

## Requirements

- macOS.
- AirPods, alternatively Beats headphones exposing those controls under macOS. Consult the [compatibility matrix](https://github.com/raulgg/pods-control/blob/HEAD/docs/compatibility.md) covering tested models.
- The [pods-control CLI](https://github.com/raulgg/pods-control), version 0.5.0 or later. Device communication happens through this extension via that tool.

## Get started

1. Connect your AirPods or Beats to your Mac.
2. Launch **Manage CLI** then complete its sequence so the CLI gets installed. Homebrew plus Apple's developer tools get verified beforehand.
3. Within Raycast's extension settings, activate optional commands and enable whichever listening modes **Cycle Listening Mode** should employ.
4. Assign hotkeys to the commands you use most, for example **Cycle Listening Mode**.

## Commands

| Command                           | What it does                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Set to Noise Cancellation**     | Sets listening mode to Noise Cancellation.                                                                             |
| **Set to Transparency**           | Sets listening mode to Transparency.                                                                                   |
| **Set to Adaptive**               | Sets listening mode to Adaptive.                                                                                       |
| **Set to Off**                    | Sets listening mode to Off.                                                                                            |
| **Cycle Listening Mode**          | Switch between listening modes you enable in the command's preferences. Skips modes your device does not support.      |
| **Toggle Conversation Awareness** | Turn Conversation Awareness On and Off. Requires a device that supports the feature.                                   |
| **Pods Status**                   | Refreshes the device's status so the commands' subtitles show the confirmed listening mode and Conversation Awareness. |
| **Manage CLI**                    | Install, update, or repair the CLI. Every screen outlines the following action and supplies it.                        |

Control commands display a success toast whenever Raycast stays open, plus a HUD once it is shut, such as during hotkey use.

### Turn on Set to Adaptive and Set to Off

Both commands are disabled by default since support is not universal. Enable the command inside Raycast's extension settings if your devices support Adaptive listening mode.

- **Set to Adaptive** requires a model that supports Adaptive.
- **Set to Off** requires Off Listening Mode on inside device settings.

### See the current state at a glance

**Cycle Listening Mode**, **Toggle Conversation Awareness**, plus **Pods Status** surface the macOS-confirmed state inside their subtitles. Activate the background refresh in the **Pods Status** command to automatically refresh those subtitles every minute.

## Preferences

| Preference                 | Command              | Description                                                                                                                             |
| -------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **CLI Path**               | Extension            | Complete path toward the `pods-control` binary. Leave it empty to detect the CLI automatically. A supplied path supersedes detection.   |
| **Modes to Cycle Through** | Cycle Listening Mode | Checkboxes covering Off, Transparency, Adaptive, and Noise Cancellation. Enable at least two. Off and Adaptive are disabled by default. |

## Troubleshooting

### "CLI not found" after installing

Open **Manage CLI**. It detects unlinked or incomplete Homebrew installs and an invalid **CLI Path**, and shows the command or preference that fixes each one. After you follow the steps, choose **Refresh** in that view and run your command again.

### "Not connected"

**Pods Status** reports **Not connected** if no AirPods or Beats are connected. Connect your device to your Mac. If several compatible devices are connected, disconnect the extras as the extension does not choose between devices.

### Adaptive or Conversation Awareness is not supported

Whether Adaptive or Conversation Awareness is supported depends on your device's model and firmware. Check the [compatibility matrix](https://github.com/raulgg/pods-control/blob/HEAD/docs/compatibility.md). No extension setting adds support your model does not have.

### "Off was not set"

Your device was never set to Off. The Off listening mode only appears when the setting is on in the device's settings.

1. Open AirPods or Beats settings on your Mac then turn on Off Listening Mode.
2. Activate **Set to Off** inside Raycast's extension settings, enable Off in **Modes to Cycle Through**, or do both.

The CLI caches whether Off Listening Mode is on. See its [note on cached Off availability](https://github.com/raulgg/pods-control/blob/HEAD/docs/cli.md#cached-allow-off-availability).

If you don't want to use Off Listening Mode, turn it off under **Modes to Cycle Through** and turn off **Set to Off**.

### Commands stopped working after a macOS update

Inspect the compatibility matrix. Afterward update the CLI via **Manage CLI** or `brew upgrade raulgg/tap/pods-control`. A completed install never proves device support.

## Report a bug

Open an issue in the [development repository](https://github.com/raulgg/raycast-extension-pods-control/issues). When the fault clearly sits in the CLI or your device, file it inside the [pods-control CLI repository](https://github.com/raulgg/pods-control/issues) instead. Once a command fails, pick **Copy Error** on its toast then insert that text into your report.

## Privacy and security

The extension only runs the CLI locally on your Mac, and no analytics are ever gathered. Private macOS audio interfaces plus a companion library that tweaks an entitlement check within its own process get used by the CLI. Accessibility permission and elevated privileges remain unnecessary. Those interfaces may shift with any macOS update from Apple. Consult the CLI's [security and trust model](https://github.com/raulgg/pods-control/blob/HEAD/SECURITY.md) prior to installation. A small local cache is retained by the CLI, documented in its [reference](https://github.com/raulgg/pods-control/blob/HEAD/docs/cli.md#cached-allow-off-availability).
