# Screens

Connect to the computers you use in [Screens 5](https://edovia.com/en/screens-mac/) from Raycast, plus ad-hoc VNC and
SSH connections to machines that aren't in your list.

## Setup

Add connections by hand, or import them from Screens. Screens keeps its library in CloudKit with no local file to
read, so importing goes through an archive you export:

1. Open **Screens**
2. Go to **Settings → Archives → Export…** and save the `.screens` file
3. Run **Import Connections** in Raycast, choose that file, and pick which connections to keep

Screens lists every machine it discovers on your network, so an archive is usually mostly hosts you would never open.
The import step preselects the ones you have actually connected to and lets you adjust from there. Quick Connect needs
no archive.

## Commands

**Search Connections** lists what you have, grouped by type and ordered by how often and how recently you connect from
Raycast. Connect with Return, or use Observe Mode (⌘⇧E) to watch without controlling and Guest (⌘⇧G) to skip saved
credentials. Filter by type from the dropdown in the top right. Add a connection with ⌘N, edit one with ⌘E to rename it
or change what it opens, and remove one with ⌃X, which drops it from Raycast and leaves Screens untouched.

**Import Connections** picks an archive and selects what to keep. Running it again replaces the list, so it both adds
new connections and drops ones you no longer want. Your previous choices come back preselected.

**Quick Connect** connects to a machine that isn't in your list. Type a host straight into the root search bar, in any
form a URL would take: `desk-imac.local`, `admin@10.0.0.4:5901`, `ssh://192.0.2.10`, or `[2001:db8::1]`. Launch it with
the host empty for a form with port, username, Observe Mode, and Guest.

## How connections are addressed

Screens' URL scheme addresses a saved connection by name or hostname, never by id. When a name or hostname uniquely
identifies one connection, this extension opens it through Screens, which carries its stored settings and credentials.
When neither does, it connects to the machine's address instead. Those rows carry an arrow icon, and the address is
shown as the subtitle so you can see exactly what a row will open.

This matters more than it sounds. Three different machines sharing one name leave Screens no way to know which you
mean, so it picks one. Addressing them directly reaches the right machine every time. Editing a connection lets you
override either choice.

RDP connections have no ad-hoc URL scheme to fall back on, so a duplicate-named RDP connection shows a warning icon
and lets Screens choose.

## Limitations

**An import is a snapshot.** Adding or renaming a connection in Screens does not change what you imported. Run Import
Connections again to pick it up, or edit the connection in Raycast.

**Nothing writes back.** Screens imports archives through a UI flow, so this extension only reads. It also can't list,
disconnect, or control a running session. Screens exposes no scripting interface, and its URL schemes are one-way.

## Credits

The Screens icon is used with permission from [Edovia](https://edovia.com). The Tailscale mark is a trademark of
Tailscale Inc., used here to label connection types.
