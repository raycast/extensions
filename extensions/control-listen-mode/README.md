# AirPods Listening Mode

Switch between Transparency and Noise Cancellation on the AirPods you are wearing. Assign one Raycast hotkey to switch in either direction.

## Command

**Toggle AirPods Listening Mode** reads the current mode, switches to the other mode, and displays the result in Raycast.

## Setup

1. Wear your AirPods and select them as your Mac’s output in System Settings → Sound.
2. Enable Automatic Ear Detection, then select Transparency or Noise Cancellation in Control Center.
3. Run **Toggle AirPods Listening Mode** from Raycast. To assign a global hotkey, find the command in Raycast Settings → Extensions and select **Record Hotkey**.

## Compatibility and troubleshooting

Tested with AirPods Pro 2 on macOS 27.2. Support for other models and macOS versions depends on whether the system exposes their listening mode and in-ear status.

- **AirPods are not detected.** Confirm that they’re connected and selected as the current audio output.
- **Raycast can’t confirm you’re wearing AirPods.** Check Automatic Ear Detection and put the AirPods back in.
- **Noise Cancellation won’t turn on with one AirPod.** Put on both AirPods or enable Noise Cancellation with One AirPod in Accessibility settings.
- **The current mode is Adaptive or Off.** Select Transparency or Noise Cancellation in Control Center first.
- **Raycast can’t confirm the change.** Check the current mode in Control Center before retrying.
