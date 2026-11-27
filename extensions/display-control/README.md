# Display Control

Display Control adjusts your monitor's built-in speaker volume, brightness, and contrast from one Raycast command. It uses the open-source [m1ddc](https://github.com/waydabber/m1ddc) command-line tool, so you do not need a separate GUI app or subscription.

## Setup

When you open **Control Displays**, the extension checks whether m1ddc is installed. If it is missing, choose **Install with Brew** to open the [Brew extension](https://www.raycast.com/nhojb/brew) with `m1ddc` already entered. Select the `m1ddc` formula and press `⌘ I` to install it inside Raycast.

If you do not have the Brew extension, choose **Get Brew Extension** to open its Raycast Store page. Raycast asks for permission when Display Control opens another extension's command. Homebrew itself must already be installed to use Brew.

After installation, reopen **Control Displays** to detect m1ddc automatically. You can also choose **Check Again** or press `⌘ R` from the setup page. Choose **Continue with Built-in Display** if you only need your Mac's built-in controls.

Enable DDC/CI in your monitor's on-screen settings if it has that option. The extension finds m1ddc in the standard Homebrew locations. You can set an absolute executable path in extension preferences if you installed it elsewhere.

## Usage

Open **Control Displays** and use the arrow keys to select a display. The detail pane shows its current speaker volume, brightness, and contrast. Shortcuts apply to the selected display and keep the list open.

| Shortcut          | Action                                                    |
| ----------------- | --------------------------------------------------------- |
| `⌘ −` / `⌘ =`     | It decreases or increases the monitor's speaker volume.   |
| `⌘ ⇧ −` / `⌘ ⇧ =` | It decreases or increases brightness.                     |
| `⌘ ⌥ −` / `⌘ ⌥ =` | It decreases or increases contrast.                       |
| `⌘ 0`             | It resets volume to its configured default.               |
| `⌘ ⇧ 0`           | It resets brightness to its configured default.           |
| `⌘ ⌥ 0`           | It resets contrast to its configured default.             |
| `⌘ ⇧ ⌥ 0`         | It resets all available controls on the selected display. |
| `⌘ R`             | It refreshes the display list and current readings.       |

Slow presses change the value by 1% of the monitor's reported maximum by default. You can choose a base step of 1%, 5%, or 10% in extension preferences. After an adjustment, the extension attempts to read the value back from the monitor.

Rapid repeats gradually increase the step. With a 1% base step, the third quick press increases it to 2%, the sixth to 5%, and the tenth to 10%. A gap longer than 350 milliseconds restores the base step. Changing direction or switching controls also starts at the base step. Reset actions use the configured default value directly.

When a monitor responds slowly, waiting repeats for the same control are combined into the latest adjustment. This keeps a long queue of changes from continuing after you stop pressing the shortcut.

The detail pane uses Raycast's native Markdown renderer with compact text and character bars. Each control shows its icon and name beside its current percentage. Its configured reset default and shortcut appear below the bar. The content uses one scrolling area, so a separate metadata pane cannot cover the controls.

A short hint below the base step explains that quick repeats accelerate and a pause restores the base step.

You can set **Default Volume**, **Default Brightness**, and **Default Contrast** in extension preferences. Their initial values are 20%, 50%, and 50%, respectively. Each accepts a whole percentage from 0 to 100. Defaults apply only when you choose a reset action. Opening the command does not change your monitor settings. **Reset All Controls** skips controls that the selected display does not support.

If m1ddc reports a successful write but the display cannot return a valid reading, the affected percentage is labeled **requested**. A temporary failure preserves the last known level and keeps the adjustment shortcuts available.

Refreshing the list keeps the last known levels for displays that are still connected. A failed read labels those levels as **last known** until the next successful read. You can switch displays while a reset runs without interrupting the newly selected display's readings.

## Compatibility

m1ddc supports external displays on Apple Silicon Macs through USB-C/DisplayPort Alt Mode and supported built-in HDMI ports. Support depends on the monitor, connection, adapter, and firmware. Each monitor may support a different subset of controls. The extension shows a control as unavailable when it cannot read a valid value and range.

Some displays return inconsistent DDC values during repeated adjustments. The extension spaces DDC commands, retries temporary failures, and rejects out-of-range readings before calculating an adjustment. Repeated key presses use recent valid levels and absolute writes. A retry targets the same display and the same requested value.

The volume control changes the monitor's own speaker volume. It does not select an audio output device or adjust the macOS software volume. Your Mac must send audio to that monitor for the change to affect what you hear.

The extension also lists your Mac's built-in display. A small bundled native helper controls its brightness and the Mac's built-in speaker volume. It targets the built-in speakers directly, even when another audio output is selected. It does not change the selected output device. macOS does not expose a hardware contrast control for the built-in display, so that control is unavailable.

The native helper builds for both Apple Silicon and Intel Macs. External DDC controls require Apple Silicon because m1ddc does not support Intel Macs. A display that m1ddc cannot reach remains visible, and its controls show as unavailable.

Built-in brightness uses macOS DisplayServices. Availability may change between macOS versions. The extension reports a failure if macOS cannot expose the control.
