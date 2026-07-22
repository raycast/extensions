# Chrome Profile Launcher

Open any Google Chrome profile in a new window on your **current** macOS desktop.
Profiles are detected automatically from your local Chrome installation — real
names, account photos, and profile colors, with no configuration.

## Why

Chrome normally focuses an *existing* profile window, which can yank you across
to another macOS Space. This extension launches a **new** Chrome application
instance for the selected profile using macOS's `open -n` behavior, so the
window opens right where you already are.

## Commands

| Command | What it does |
| --- | --- |
| **Open Chrome Profile** | A searchable list of your profiles. `↵` opens the selected profile in a new window on your current desktop. This is also where you create hotkey quicklinks. |
| **Chrome Profiles Menu Bar** | A menu-bar icon with a dropdown of your profiles — launch one without opening Raycast. |
| **Launch Profile** | Launches a profile named in its argument. You rarely run this by hand; it's the command that powers the global hotkeys (see below). |

### About the menu-bar command

Run **Chrome Profiles Menu Bar** once to activate it; the icon then persists in
your menu bar across restarts (it's restored automatically as long as Raycast
launches at login). It refreshes once a day in the background. To remove it,
⌘-drag the icon out of the menu bar.

## Per-profile global hotkeys

Bind a key like ⌥⌘1 to open a specific profile from anywhere — no Raycast window.

### How it works

The key is not attached to a command directly. It's attached to a **quicklink**,
which is a tiny saved shortcut that runs the **Launch Profile** command for one
specific profile:

```
press ⌥⌘1  →  quicklink  →  Launch Profile "Profile 8"  →  Chrome opens
     (you set this)      (runs under the hood)
```

Think of the quicklink as a speed-dial button and **Launch Profile** as the
number it dials. The **Open Chrome Profile** list is just the easiest place to
*create* the quicklink — it isn't what runs when you press the key.

### Setup (once per profile)

1. Open **Open Chrome Profile** and highlight the profile you want a key for.
2. Press `⌘K` and run **Create Quicklink for Hotkey**. This saves a quicklink
   named "Launch &lt;profile&gt;", pre-wired to that exact profile.
3. Go to **Raycast Settings → Extensions → Quicklinks**, find that quicklink,
   and assign it a hotkey.
4. Press the hotkey anywhere — the profile opens in a new window on your current
   desktop.

Repeat for each profile you want a key for. (You can also just type
**Launch Profile** in Raycast's root search and enter a profile name, without
setting up a hotkey at all.)

## Features

- Auto-detects every profile from Chrome's `Local State`, including
  custom-named profile directories.
- Shows each profile's real name, account email, Google account photo (or a
  colorful initials avatar), and its actual Chrome theme color.
- Learns which profiles you use most and floats them to the top (frecency). This
  ranking is shared between the list and the menu bar.
- Actions on each profile in the list:
  - **Open New Chrome Window** — `↵`
  - **Open Incognito Window** — `⌘↵`
  - **Reveal Profile Folder** in Finder — `⌘⇧F`
  - **Copy Launch Command** — `⌘⇧C`
  - **Create Quicklink for Hotkey** — sets up a per-profile hotkey (above)
  - **Refresh Profiles** — `⌘R`
- Search matches profile name, email, and internal directory.
- Resilient: if `Local State` is missing or unreadable, it falls back to
  scanning the Chrome data folder, and partial/malformed metadata never crashes
  the list.

## How launching works

Every launch runs, via a process argument array (never a shell string):

```bash
open -n -a "Google Chrome" --args --profile-directory="<DIRECTORY>" --new-window "chrome://newtab"
```

- `-n` starts a **new** Chrome instance — this is what keeps the window on your
  current Space instead of switching to an existing one.
- `--new-window "chrome://newtab"` forces Chrome to actually open a fresh window
  rather than focusing an existing one.
- Using an argument array (not a concatenated shell command) means there is no
  shell-escaping or command-injection risk, whatever a profile directory is
  named.

## Troubleshooting: a window opens on the wrong desktop

Rarely, macOS may still place the new window on another Space, or pull you to
one. This is a known Chromium behavior on macOS 15+ and is governed by a macOS
setting, not the extension — no command-line flag can override it. To make Chrome
reliably open on your **current** desktop:

- **System Settings → Desktop & Dock → Mission Control** → turn **off**
  _"When switching to an application, switch to a Space with open windows for the
  application."_
- Optionally, right-click **Google Chrome** in the Dock → **Options** →
  **Assign To → None**.

With that setting off, the `open -n` launch lands the window on your current
desktop consistently.

## Privacy

This extension reads only the minimum needed to identify and launch profiles:

- `~/Library/Application Support/Google/Chrome/Local State` — profile metadata
- each profile's `Preferences` file — display-name fallback only
- whether a profile's local photo file exists on disk

It does **not** read browsing history, passwords, cookies, or open tabs. It
makes **no** network requests and sends **no** analytics. Profile names and
emails never leave your machine.

## Requirements

- macOS
- Google Chrome installed at `/Applications/Google Chrome.app` (or
  `~/Applications/Google Chrome.app`)
