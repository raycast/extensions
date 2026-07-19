# Security

## Reporting a vulnerability

Please report security issues privately via
[GitHub Security Advisories](https://github.com/chiptoma/sidecar-display/security/advisories/new)
rather than a public issue. I'll acknowledge within a few days.

## What this extension does

Being explicit, since it touches your displays and uses a private Apple
framework:

- **It uses a private Apple framework.** The Native engine loads
  `SidecarCore.framework` at runtime with `dlopen` and dispatches selectors
  (`connectToDevice:`, `disconnectFromDevice:`) reflectively — the same approach
  as other Sidecar tools. Nothing private is linked at build time. This is
  undocumented API: a macOS update can change or remove it, in which case the
  affected command fails with a clear error and you can switch to the
  BetterDisplay engine. Display mirroring itself uses **public** CoreGraphics.
- **It runs local binaries.** The BetterDisplay engine executes
  `betterdisplaycli` at the path you configure (default
  `/opt/homebrew/bin/betterdisplaycli`). Arguments are passed via `execFile` as
  an argv array — never interpolated into a shell — so a device name cannot
  become a command.
- **It changes display configuration.** It connects/disconnects the Sidecar link
  and adds/removes the iPad from a mirror set. It never writes the main display.
  The one operation that power-cycles anything is the opt-in **Fix Mirroring**,
  which only ever cycles *virtual* screens and always reconnects them. See the
  invariants in [CLAUDE.md](./CLAUDE.md#invariants--never-break-these).

## What it does not do

- **No network access.** It makes no HTTP requests and has no telemetry or
  analytics of any kind.
- **No credentials.** It reads no Keychain items, tokens, or passwords.
- **No data collection.** The only things it stores are, via Raycast's
  `LocalStorage`: your connect/disconnect intent and the device name you picked
  in the menu bar. Both stay on your Mac.
- **No bundled binaries.** The native helper is compiled from the Swift source
  in [`swift/`](./swift) at build time; nothing opaque is shipped.

## Scope

This is a macOS-only Raycast extension with no server component. The realistic
risk surface is the display-reconfiguration behaviour above — which is why those
invariants are enforced in code and covered by tests that need no hardware
(`npm run test:unit`).
