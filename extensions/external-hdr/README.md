# External HDR

Turn HDR on or off for external displays on macOS, from Raycast.

- **Toggle HDR** — flips HDR for your display. The subtitle says what pressing it will do: `Disable HDR — LG HDR 4K` when HDR is on, `Enable HDR — …` when it is off.
- **HDR Displays** — a menu-bar icon with the live state and a one-click toggle per display.
- **HDR on Connect** — per-display rules: apply HDR on, or off, whenever that display connects.

## Requirements

macOS 13 or later, Raycast, and an HDR-capable external display.

No helper app, no paid license, and no permissions: no Accessibility, no Screen Recording, no Automation.

## Using it

Assign a hotkey to **Toggle HDR** in Raycast → Settings → Extensions → External HDR.

**HDR Displays** lives in the menu bar. Its icon is filled when the target display is in HDR, hollow when it is not, and shows an exclamation mark when no HDR display is connected. Refresh it with ⌘R; it also refreshes every ten minutes.

**HDR on Connect** lists your HDR-capable displays. Pick one and choose **Apply HDR on When Connected** or **Apply HDR off When Connected**. The rule is applied immediately and again whenever that display reconnects.

Raycast schedules the reconnection checks at one-minute intervals through the **Apply HDR Rules** command. That schedule starts after you open **Apply HDR Rules** once, or after you enable **Background Refresh** for it in Raycast → Settings → Extensions → External HDR. While no rule exists, nothing runs.

## How it works

macOS has no public API for HDR. The extension includes a small Swift package (`swift/`) that calls the private `MonitorPanel` framework's `setPreferHDRModes:` — the same call BetterDisplay and DisplaySync use — and exposes it to the extension through Raycast's official Swift bridge. Raycast compiles the package at build time, so no binary is shipped.

It needs no SIP changes, entitlements, administrator rights, or TCC permissions, and it never changes the display mode itself.

## Limitations

- Switching HDR makes the panel change modes: about a second of black screen, and windows may reposition once.
- `MonitorPanel` is private and undocumented. A future macOS could remove it; there is no public replacement.
- Auto-apply checks once a minute and only while Raycast is running. A reconnect between two checks is detected when macOS assigns the display a new system ID, which it usually does; a reconnect that keeps the same ID within the interval can be missed.
- Rules are keyed by the display's UUID, so two monitors with the same name are handled separately.
- The display name comes from the monitor's EDID, the same string System Settings shows.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "No external HDR-capable display is connected" | Check the cable and port; HDR needs DisplayPort 1.4 or HDMI 2.0 bandwidth. |
| "… is not connected" | The **Target Display** preference names a display that is not plugged in. Connect it or clear the preference. |
| HDR does not switch | The panel did not reach the requested state. Retry; some docks swallow the mode change. |
| A rule does not apply on reconnect | Open **Apply HDR Rules** once, and confirm **Background Refresh** is enabled for it in the extension preferences. |
| The menu-bar icon is stale | It refreshes every ten minutes and after any toggle made from it. |

## Uninstall

Open **HDR on Connect** and choose **Clear All Rules**, then remove the extension from Raycast. Rules and connection history live in Raycast's support folder for this extension and are removed with it.

## License

MIT.
