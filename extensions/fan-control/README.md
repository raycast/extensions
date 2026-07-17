# Fan Control for Raycast

A local Raycast extension for controlling Mac fans through
[smctl](https://github.com/leaperone/smctl).

## Features

- **Automatic** returns fan control to macOS.
- **Quiet** applies smctl's low-noise curve.
- **Blast Off** runs all fans at full speed.
- **Custom Control** applies a specific RPM target.
- Custom named presets are stored locally by Raycast.
- Fan status shows actual, target, minimum, maximum, and control mode.
- Root-search commands apply Automatic, Quiet, Blast Off, or a custom speed
  without navigating through the dashboard.
- Saved presets can be promoted to root search as Raycast Quicklinks. Raycast
  does not expose Quicklink deletion to extensions, so remove the matching
  `Fan: <name>` Quicklink manually after deleting a preset.

## One-time setup

This extension targets Apple Silicon Macs running macOS 14 or later. Fan
writes require smctl's privileged helper; Raycast itself never receives or
stores an administrator password.

1. Download the signed and notarized ARM64 archive from the
   [latest smctl release](https://github.com/leaperone/smctl/releases/latest).
2. Install both `smctl` and `smctld` somewhere on your `PATH`.
3. Register the privileged helper and verify it:

   ```sh
   sudo smctl daemon install
   smctl daemon ping
   smctl fan status
   ```

Homebrew installation is also supported with
`brew install leaperone/smctl/smctl`, but building the current formula requires
the full Xcode application. If `smctl` is installed somewhere else, update
**smctl Path** in the extension preferences.

## Develop

```sh
npm install
npm run dev
```

Use **Automatic** when you no longer need a manual target or custom profile.
The smctl daemon retains its thermal safety guard while a preset is active.
