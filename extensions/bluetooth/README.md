# Bluetooth

Manage Windows Bluetooth from Raycast: turn the radio on or off, see what is
currently connected, and reconnect a paired device without opening Settings.

## Commands

| Command             | What it does                                                            |
| ------------------- | ----------------------------------------------------------------------- |
| **Bluetooth Devices** | Lists paired devices split into Connected and Available, with connect and disconnect actions. |
| **Toggle Bluetooth**  | Flips the radio on or off and reports the new state.                    |

## Requirements

Windows only. Nothing to install and no administrator rights are needed — the
extension talks to Windows through the built-in `powershell.exe` (Windows
PowerShell 5.1, which ships with Windows).

## Notes and limitations

- **Bluetooth LE devices are listed but cannot be connected from here.** Windows
  connects LE peripherals such as mice and keyboards on its own, so they appear
  with a _Managed by Windows_ label and no connect action. Connecting is driven
  by the Win32 service API, which only covers Classic Bluetooth.
- **Connecting takes a few seconds.** Each profile change blocks inside the
  Bluetooth driver for roughly three seconds; the extension issues them in
  parallel so the wait does not grow with the number of profiles.
- **Dual-mode devices appear once.** A device reachable over both Classic and LE
  is merged into a single row, shown as connected if either transport is.
- Scanning, pairing, and removing devices are not supported yet.
