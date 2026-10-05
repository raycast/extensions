# Fan Control for Raycast

Control your Mac's fan RPM straight from Raycast — view live fan speed, set a manual RPM target, apply quiet/full profiles, or hand control back to macOS.

Works on **Apple Silicon** (verified path: M4). Powered by [smctl](https://github.com/leaperone/smctl), the open-source SMC control CLI.

## How it works

Raycast extensions run in a sandboxed Node runtime and cannot talk to hardware directly. Writing fan targets to the SMC (System Management Controller) also requires root. This extension delegates both problems to `smctl`:

```
Raycast extension (TypeScript)
        │  execFile
        ▼
smctl CLI  ──XPC──►  smctld (root LaunchDaemon)  ──IOKit──►  SMC (fan keys)
```

- **Reads** (`smctl sensors --json`) need no daemon and no root — fan RPM and temperatures always work.
- **Writes** (`smctl fan set`, `smctl fan profile`) go through the `smctld` daemon, installed once with `sudo`.

smctl ships a thermal safety guard: if temperatures climb too high while fans are under manual control, it forces fans back to system control. Fans also return to macOS control if the daemon is stopped or uninstalled.

## Setup

1. Install smctl:

   ```sh
   brew install leaperone/smctl/smctl
   sudo smctl daemon install
   ```

2. Install the extension (development mode):

   ```sh
   npm install
   npm run dev
   ```

   Raycast will pick up the extension automatically while `ray develop` is running. Use `npm run build` for a production build.

## Commands

| Command | What it does |
|---|---|
| **Control Fans** | List of fans with live actual/target RPM, supported range, and control mode. Actions: set manual RPM (per fan or all), quiet profile, full speed, back to auto. |
| **Set Fan Speed** | Quick command — type an RPM as argument, applies to all fans. Validates against the hardware range. |
| **Set Fans to Auto** | One keystroke to return fan control to macOS. |

## Preferences

- **smctl Path** — override the binary location if it's not in `/opt/homebrew/bin` or `/usr/local/bin`.

## Troubleshooting

- **"smctl is not installed"** — run `brew install leaperone/smctl/smctl`.
- **"smctld is not running"** — writes need the daemon: `sudo smctl daemon install` (check with `smctl daemon status`).
- **Fans stuck in manual mode you didn't set** — another fan tool (or a previous `smctl fan set`) left a manual target. Use *Set Fans to Auto*.

## License

MIT
