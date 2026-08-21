# Screens

Connect to the computers you use in [Screens 5](https://edovia.com/en/screens-mac/) from Raycast, plus ad-hoc VNC and
SSH connections to machines that aren't in your library.

## Setup

Screens keeps its library in CloudKit with no local file to read, so this extension imports from an archive you export:

1. Open **Screens**
2. Go to **Settings → Archives → Export…** and save the `.screens` file
3. Run **Import Screens** in Raycast, choose that file, and pick which screens to keep

Screens lists every machine it discovers on your network, so an archive is usually mostly hosts you would never open.
The import step preselects the ones you have actually connected to and lets you adjust from there. Quick Connect needs
no archive.

## Commands

**Search Screens** lists what you imported, grouped by connection type and sorted by when you last connected. Connect
with Return, or use Observe Mode (⌘⇧E) to watch without controlling and Guest (⌘⇧G) to skip saved credentials. Remove a
screen with ⌃X, which drops it from Raycast and leaves Screens untouched.

**Import Screens** picks an archive and selects what to keep. Running it again replaces the list, so it both adds new
screens and drops ones you no longer want. Your previous choices come back preselected.

**Quick Connect** takes a host, protocol, port, and username and opens a VNC or SSH session without saving anything.

## How connections are addressed

Screens' URL scheme addresses a saved screen by name or hostname, never by id. When a name and hostname both uniquely
identify one screen, this extension opens the saved screen, which carries its stored settings and credentials. When
they don't, it connects to the machine's address instead. Those rows carry an arrow icon, and the address is shown as
the subtitle so you can see exactly what a row will open.

This matters more than it sounds. A library with three machines all named "Tailgate" has no way to say which one you
mean, and Screens itself would pick. Addressing them directly reaches the right machine every time.

RDP screens have no ad-hoc URL scheme to fall back on, so a duplicate-named RDP screen shows a warning icon and lets
Screens choose.

## Limitations

**The archive is a snapshot.** Adding or renaming a screen in Screens does not change what you imported. Run Import
Screens again to pick up changes.

**Nothing writes back.** Screens imports archives through a UI flow, so this extension only reads. It also can't list,
disconnect, or control a running session. Screens exposes no scripting interface, and its URL schemes are one-way.
