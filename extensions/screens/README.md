# Screens

Open your saved [Screens 5](https://edovia.com/en/screens-mac/) connections from Raycast, or connect to a computer
that isn't in your library.

## Setup

Screens keeps its library in CloudKit with no local file to read, so this extension reads an archive you export:

1. Open **Screens**
2. Go to **Settings → Archives → Export…**
3. Save the `.screens` file somewhere it will stay put, such as your Documents folder
4. Run **Search Screens** in Raycast and select that file when prompted

Quick Connect works without an archive.

## Commands

**Search Screens** lists everything in the archive, grouped by connection type and sorted by when you last connected.
Connect with Return, or use Observe Mode (⌘⇧E) to watch without controlling and Guest (⌘⇧G) to skip saved credentials.

**Quick Connect** takes a host, protocol, port, and username and opens a VNC or SSH session without saving anything.

## Limitations

**The archive is a snapshot.** Adding or renaming a screen in Screens does not change the archive. Export again and the
list picks it up. The navigation title shows the archive's date so a stale list is visible rather than silent.

**Duplicate names may connect directly.** Screens' URL scheme addresses a saved screen by name or hostname, never by id.
When two screens share both, this extension can't say which one Screens would open, so it connects to the host's address
instead. That reaches the right machine but skips the saved screen's stored settings and credentials. Rows in that state
carry an arrow icon, and RDP screens have no direct address to fall back on, so they show a warning icon instead.

**Nothing writes back.** Screens imports archives through a UI flow, so this extension only reads. It also can't list,
disconnect, or control a running session. Screens exposes no scripting interface, and its URL schemes are one-way.
