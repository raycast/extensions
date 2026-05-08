# iCloud Sync Control

Pause and resume iCloud Drive syncing without disabling iCloud entirely. Useful when you're on a tethered connection, on a metered network, in a meeting, or just want files to stop uploading while you finish working on them.

## Commands

- **Pause iCloud Sync** — pause if running; no-op if already paused.
- **Resume iCloud Sync** — resume if paused; no-op if already running.

## How it works

Apple does not ship a public "pause iCloud Drive" toggle. Under the hood, iCloud Drive sync is performed by a per-user daemon called `bird`. This extension finds `bird`'s process ID and sends it Unix signals:

- **Pause:** `SIGSTOP` — the kernel suspends the process. Network I/O and filesystem watching freeze.
- **Resume:** `SIGCONT` — the kernel resumes the process exactly where it left off. In-flight uploads pick back up.

```
kill -STOP <bird-pid>   # pause
kill -CONT <bird-pid>   # resume
```

Status is detected by reading `bird`'s process state with `ps -o state=` (T = stopped, anything else = running).

No `sudo` is required because `bird` runs as your user, and you can always signal your own processes. SIP is not involved — we're not asking launchd to do anything; we're talking directly to the kernel.

## Scope

This controls **iCloud Drive file syncing only** (the `bird` daemon). It does **not** affect:

- Photos / iCloud Photo Library
- iCloud Keychain
- iCloud Mail / Contacts / Calendar
- Find My
- Any other iCloud feature handled by `cloudd` or other daemons

If you sign out of iCloud or disable iCloud Drive in System Settings, this extension has nothing to control.

## Caveats

- A pause does **not** survive logout, reboot, or `bird` being killed and relaunched by launchd. macOS gives the new `bird` process a fresh PID in the running state. Re-pause if needed.
- While paused, file changes still happen locally; FSEvents queue up and `bird` processes them when resumed.
- Long pauses (multiple hours) may cause CloudKit network connections to time out and reconnect on resume. Normal — uploads still complete, just with a brief reconnection delay.
- "Optimize Mac Storage" eviction is not affected. This only stops the sync daemon.

## Requirements

- macOS (any modern version with iCloud Drive — tested on Sequoia)
- iCloud Drive enabled and signed in
- Raycast

## Development

```bash
npm install
npm run dev
```

## License

MIT
