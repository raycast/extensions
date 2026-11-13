# Toggle Trackpad

Quickly toggle whether macOS ignores the built-in trackpad when a mouse or wireless trackpad is connected.

Run **Toggle Trackpad** from Raycast to switch the setting immediately. The HUD shows **Built-in Trackpad Ignored** or **Built-in Trackpad Available**.

## Development

```bash
npm run dev
```

With Raycast open, search for `trackpad` and run **Toggle Trackpad**. Verify the HUD and the actual built-in trackpad behavior while an external mouse or wireless trackpad is connected.

## Compatibility

This extension changes the current user's `USBMouseStopsTrackpad` preference and then applies it using the private macOS `activateSettings` utility. This utility is included with macOS, requires no administrator privileges, and may change or disappear in a future macOS release.

If **System Settings > Accessibility > Pointer Control > Trackpad Options** is already open, its switch may not refresh immediately. The setting and trackpad behavior still change immediately; reopen the pane to see the current switch state.
