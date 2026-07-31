# WHost

A **Windows-only** [Raycast](https://raycast.com) extension for visually managing and switching the Windows `hosts` file — no more manually editing `C:\Windows\System32\drivers\etc\hosts` and flushing DNS by hand.

## Features

- Manage multiple named **profiles** (groups) of IP↔hostname mappings.
- Enable / disable a whole profile with one keystroke; the hosts file updates automatically.
- Edit or delete profiles, and copy a profile's hosts snippet to the clipboard.
- Flush DNS (`ipconfig /flushdns`) automatically after every change.
- Only a **managed block** inside the hosts file is touched; your existing entries (e.g. `localhost`) stay intact.

## Implemented

Everything below is already working in the current build:

- **Profile management (CRUD)** — create, edit, and delete named profiles via a form, persisted in `profiles.json`.
- **Enable / disable profiles** — toggling a profile rewrites its mappings in the hosts file (live lines vs. commented lines) and flushes DNS.
- **Multi-mapping profiles** — each profile holds one or more `IP hostname [# comment]` mappings, edited in a single `Form.TextArea`.
- **Copy Hosts Snippet** — copy a profile's raw mapping lines to the clipboard.
- **Flush DNS** — automatic after every change, plus a manual action.
- **Open Hosts File** — reveal the hosts file from the action panel.
- **Managed block** — wHost only owns a marked block inside the hosts file; pre-existing entries (e.g. `localhost`) are preserved.
- **Elevation fallback** — direct write first; one-time UAC-elevated PowerShell only when the direct write is denied.
- **Real-time list refresh** — the profile list reloads from disk after create/edit/delete/enable/disable, so changes show immediately.
- **Windows-only** — declared via `platforms: ["Windows"]`; all user-facing strings are in English.

## How it works

Profiles are stored as the single source of truth in `profiles.json` under Raycast's support directory. The hosts file is _derived_ from that configuration: wHost injects a block delimited by

```
# === wHost managed start ===
# === wHost managed end ===
```

and rewrites it on every change. Enabled profiles are written as live mapping lines; disabled profiles are written as commented lines.

> **Note:** Writing to the hosts file requires administrator privileges. wHost tries a direct write first, and falls back to a one-time UAC prompt (elevated PowerShell) only when needed. Running Raycast as administrator removes the prompt entirely.

## Commands

| Action                   | Description                                   |
| ------------------------ | --------------------------------------------- |
| New Profile              | Create a group of host mappings               |
| Enable / Disable Profile | Toggle a profile's mappings in the hosts file |
| Edit Profile             | Change the name or mappings                   |
| Delete Profile           | Remove the profile and its mappings           |
| Copy Hosts Snippet       | Copy the raw mapping lines to the clipboard   |
| Flush DNS                | Manually run `ipconfig /flushdns`             |
| Open Hosts File          | Reveal the hosts file in your file manager    |
