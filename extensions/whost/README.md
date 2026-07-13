# wHost

A **Windows-only** [Raycast](https://raycast.com) extension for visually managing and switching the Windows `hosts` file — no more manually editing `C:\Windows\System32\drivers\etc\hosts` and flushing DNS by hand.

## Features

- Manage multiple named **profiles** (groups) of IP↔hostname mappings.
- Enable / disable a whole profile with one keystroke; the hosts file updates automatically.
- Edit or delete profiles, and copy a profile's hosts snippet to the clipboard.
- Flush DNS (`ipconfig /flushdns`) automatically after every change.
- Only a **managed block** inside the hosts file is touched; your existing entries (e.g. `localhost`) stay intact.

## How it works

Profiles are stored as the single source of truth in `profiles.json` under Raycast's support directory. The hosts file is *derived* from that configuration: wHost injects a block delimited by

```
# === wHost managed start ===
# === wHost managed end ===
```

and rewrites it on every change. Enabled profiles are written as live mapping lines; disabled profiles are written as commented lines.

> **Note:** Writing to the hosts file requires administrator privileges. wHost tries a direct write first, and falls back to a one-time UAC prompt (elevated PowerShell) only when needed. Running Raycast as administrator removes the prompt entirely.

## Commands

| Action | Description |
| --- | --- |
| New Profile | Create a group of host mappings |
| Enable / Disable Profile | Toggle a profile's mappings in the hosts file |
| Edit Profile | Change the name or mappings |
| Delete Profile | Remove the profile and its mappings |
| Copy Hosts Snippet | Copy the raw mapping lines to the clipboard |
| Flush DNS | Manually run `ipconfig /flushdns` |
| Open Hosts File | Reveal the hosts file in your file manager |
