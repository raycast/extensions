# Alter Ego

One hotkey, a different result for each macOS user account.

## Why

If you use more than one macOS account on the same Mac (say, **work** and
**personal**) and sign in to Raycast with the same account on both, Cloud Sync
gives you the same Quicklinks and hotkeys everywhere. That's usually what you
want, but sometimes the *same* hotkey should do something *different*
depending on who's signed in:

- **⌥B** opens Arc on your work account and Safari on your personal one.
- **⌥V** runs Raycast's Clipboard History on personal, but a company extension's
  command on work.
- **⌥D** opens your work project folder on one account and `~/Downloads` on the
  other.

Raycast has no built-in way to do this. A synced hotkey points at one fixed
target, and if you give each account its own separate command, each one needs
its own hotkey. Alter Ego adds a small switch in between: you press one hotkey,
Alter Ego checks which macOS user is signed in, and runs that user's target.

## Why a Quicklink?

The per-user mapping has to reach every account, and the only thing that
reliably travels between accounts is data that Raycast Cloud Sync carries. An
extension's own storage stays local to one account, so a mapping saved there
would never reach your other accounts.

**Quicklinks do sync.** Alter Ego therefore stores the whole
`username → target` mapping *inside* a Quicklink: the Quicklink's link runs
Alter Ego's **Run for Current User** command and carries the mapping as its
argument. That means:

- **Set it up once, use it everywhere.** Create the Quicklink and give it a
  hotkey on one account, and both show up on your other accounts through Cloud
  Sync.
- **One source of truth.** The Quicklink *is* the configuration. Alter Ego keeps
  no local copy that could go stale when another account edits the mapping.
- **Nothing to host.** No server, no account, no files: just a Quicklink.

The trade-off: Raycast doesn't let extensions read or update Quicklinks, so
when you change a mapping, you paste the updated link into the Quicklink
yourself (see [Editing a mapping](#editing-a-mapping)). It's one paste per
change, and the hotkey stays assigned.

## Requirements

- **macOS only.** Alter Ego matches targets against macOS user accounts and
  isn't available for Raycast on Windows.
- **Raycast Pro with Cloud Sync enabled**, signed in with the **same Raycast
  account** on every macOS account you want to cover. Without Cloud Sync, Alter
  Ego still works, but only on a single account.
- Alter Ego enabled on each macOS account. Cloud Sync syncs extensions, but they
  have to be enabled on each device.

## Setup

### First account

1. Run **Manage Alter Ego** and choose **Add Mapping**.
2. Give the Quicklink a name (e.g. `Browser`), then pick a target for the
   current macOS user.
3. Choose **Create Quicklink**, save it, and assign it a hotkey.

### Each additional account

1. Sign in to the other macOS account and wait for Cloud Sync to bring over
   the Quicklink and its hotkey.
2. Press the hotkey. There's no mapping for this user yet, so Alter Ego opens
   **Manage Alter Ego** with the current mapping already loaded.
3. Add a mapping for this user and choose **Save & Copy Updated Link**.
4. Alter Ego opens **Search Quicklinks**. Select the `Alter Ego: <name>`
   Quicklink, press <kbd>⌘K</kbd> → **Edit**, paste the link, and save.

From now on, the hotkey runs the right target on both accounts.

### Editing a mapping

1. **Search Quicklinks** → select the `Alter Ego: <name>` Quicklink →
   <kbd>⌘K</kbd> → **Copy Link**.
2. Run **Manage Alter Ego**. It detects the link on your clipboard and loads
   the mapping from it.
3. Add, edit, or remove rows, then choose **Copy Updated Link**.
4. **Search Quicklinks** → same Quicklink → <kbd>⌘K</kbd> → **Edit** → paste →
   save.

Editing the Quicklink in place keeps its hotkey and the rows for your other
accounts.

## Target types

| Type | Example | How to set it |
|------|---------|---------------|
| Application | Arc, Safari, Slack | Pick from the list of installed apps |
| Raycast Command | Clipboard History, any extension or script command | Paste its deeplink: select the command in Raycast's root search and press <kbd>⇧⌘C</kbd> |
| URL | `https://calendar.google.com` | Type or paste |
| File or Folder | `~/Projects` | Pick with the file picker |

## Good to know

- **Multiple hotkeys:** each Quicklink holds one mapping. For a second
  per-user hotkey (e.g. a browser one and a notes one), create a second
  Quicklink with a different name.
- **Usernames** are macOS short account names (the name of your home folder),
  not display names.
- **Don't run *Run for Current User* directly.** It only works when launched
  from its Quicklink. If you run it directly, Alter Ego sends you to **Manage
  Alter Ego** instead.
