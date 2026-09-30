# Window Switcher & Badges

One hotkey opens one app-first list. Every running app with a discovered window is there, so any window (hidden,
minimized, on another Desktop, full screen, or plain) can be reached and focused exactly. The apps whose Dock badges
you track show their current badge text on the same rows, and pinned apps are listed even when they have no window, so
the list also works as a launcher.

Works with Raycast Free on Macs with Apple silicon. No Pro APIs, no Screen Recording, no network, no background process.

![Pinned + Badged: pinned apps with their Dock badges, Minimized tags, and the pinned Trash row](media/pinned-and-badged.png)

![Manage Pinned Apps: Pinned, Badge Tracking, Utilities, and Available sections](media/manage-pinned-apps.png)

![Badged Only: just the apps that have a Dock badge right now](media/badged-only.png)

## Requirements

- A Mac with Apple silicon. Both helpers are built for arm64 only; on an Intel Mac the list says "Requires a Mac with
  Apple silicon" instead of reading windows or badges.
- Accessibility granted to **Raycast.app** (System Settings → Privacy & Security → Accessibility; named Device Control
  and Data Access on macOS 27). The helpers run as children of Raycast and use Raycast's grant; nothing else needs one.

Do not switch Raycast's Accessibility permission off while Raycast is running: on the author's Mac that froze keyboard
and click input twice (Raycast's Hyper Key event tap). Quit Raycast first if you need to change it.

## Set the hotkeys

Raycast Settings → Extensions → **Window Switcher & Badges**:

- **Manage Apps**: put your main hotkey here. It reopens the list fresh on every press, so the window scan and the
  badge read are never stale. **App List** is the screen Manage Apps opens; it needs no hotkey.
- **Quit Selected App** (optional): quits the app selected in the open list (normal quit) and keeps the list open. Apps
  running without a window (Discord in its tray, Mail with its window closed) are found through the system's
  `lsappinfo`. Pressed with no list open, or more than 30 s after the last selection, it just opens the list.
- **Quit Other Apps** (optional): quits every running app in the list except the selected one, after a confirmation;
  never Finder.
- **Manage Pinned Apps** (optional): the same screen as ⌘⇧C in the list.

Inside the list, the row actions Quit <App> (⌃Q) and Quit Other Apps (⌃⇧Q) do the same as the two quit commands. The
commands exist because Raycast's Hyper Key cannot drive a row action: Raycast turns it into its own hotkeys before the
list sees the keystroke, but it can trigger a command hotkey.

## Using it

Each press runs the window helper and the badge helper once, independently. Rows appear as soon as your settings load
and fill in as each helper answers; a failure of one never hides what the other found.

**App row:** icon, app name, the window title as subtitle when the row targets one window (clipped to 64 characters;
the full title is in the tooltip), then (in this order, only those that apply) `N windows` for two or more, `Hidden`,
and for a one-window app `Minimized`, `k of N match` while searching, `▸` when the app's windows are collapsed, the
Dock badge (tracked apps only: `3`, a red `•` for ten or more with the count in the tooltip, an orange `•` or text for
non-numeric badges, a muted `−` for no badge, `Not in Dock`, `Not installed`, or a yellow `Unavailable` marker), and
one icon slot at the far right: the pin, a yellow warning when the window read failed, an exclamation mark when a
window could not be read, or a blank so rows line up.

**Window rows** sit directly beneath their app row (`↳ title`) for apps with two or more windows; a one-window app is
one direct row. Return on a window row focuses exactly that window. Duplicate titles are numbered
(`2 of 3 with this title`).

**Return on an app row:** switches to its only window; on an expanded multi-window app switches to the first window
listed beneath (the action label names it); on a collapsed one shows its windows; on an app with no windows opens the
app. A window that has closed gives "That window closed" and a rescan, never a substitute window.

**Search** matches every whitespace-separated word, case-insensitively, against app names and window titles. A
distinctive title fragment gives the app row with that title as subtitle, `1 of N matches`, and one window row; Return
focuses it. Typing an app's name gives just the app row (`Show Windows` expands it). Identical titles give
`2 of N match`, never a silent pick.

**Filters** (⌘P dropdown, or ⌘⇧V to cycle): **All Apps** (default: every app with a window, plus tracked apps that are
pinned, badged, or whose badge is unavailable), **Pinned + Badged**, and **Badged Only** (tracked apps only, in your
order). The filter is remembered.

**Trash** (a **Utilities** section below every app row, so it never changes the app order): pin it with ⌘. on the row
or in Manage Pinned Apps to keep it at the end of All Apps and Pinned + Badged; unpinned, type `trash`, `empty`, or
`bin` to find it in those two filters. Badged Only never shows it. Return opens the Trash in Finder. **Empty Trash…**
(in the ⌘K actions panel) always asks first; after you confirm, Raycast's own System Actions → Empty Trash does the erasing, so Raycast may
also ask: the first time, "Run Command / Always Run Command" (Raycast asks whenever an extension starts another
extension's command), then its own warning if `Show Warning Before Emptying Trash` is on. This extension never deletes
a file and needs no Finder permission. If Empty Trash is disabled in Raycast, a toast says so and nothing is erased.

**Sort** (⌘⇧S, All Apps only): **Alphabetical** (default) or **Recent in This Command**. The second is named for what
it measures: apps you switched to or opened *through this command* first, then apps with an on-screen window front to
back, then the rest alphabetically. It is not a system-wide last-used history.

**Other actions:** ⌘R refreshes both helpers; ⌘⇧R windows only; ⌘⌥R badges only. ⌘. pins or unpins (pinning an
untracked app adds it to badge tracking too). ⌃Q quits the selected app (normal quit; the list stays open and
rescans) and ⌃⇧Q quits every other running app in the list after a confirmation (Finder is never quit). ⌥←/⌥→ collapse
or expand a group, ⌥⇧←/⌥⇧→ all groups; the `Expand windows by default` preference sets the starting state for each
press. ⌘⇧C opens Manage Pinned Apps. ⌘⇧D copies diagnostic info (it includes window titles and badge text, only goes
to the clipboard when you ask, and is kept out of Raycast's Clipboard History).

## Manage Pinned Apps

⌘⇧C in the list, or the **Manage Pinned Apps** command. Sections: Pinned, Badge Tracking, Utilities, and Available.

- **Badge tracking** means the list reads that app's Dock badge (the red count on its Dock icon) and shows it on the
  row. It only matters for apps that badge (Mail, Slack, Discord, Messages, Calendar). A badge-tracked app that is not
  pinned is listed only while it has a window or a badge.
- **Pinned** apps are badge-tracked and always listed in All Apps and Pinned + Badged, even with no window, so the list
  works as a launcher for them.
- **Available** apps are not badge-tracked and appear only while they have a window.
- Move Up/Down (⌘⌥↑/↓) sets the order used by the two badge filters; Pin/Unpin (⌘.); Add; Remove (⌃X). Utilities holds
  the Trash row's own pin, outside that order.

Changes apply as soon as you return to the list, with no rescan.

This is a command rather than a set of preferences because Raycast preferences have no list or reordering type.

## First run and your data

On the first run the extension badge-tracks and pins a default set of apps (Reminders, Mail, WhatsApp, Calendar, Slack,
Discord, Microsoft Teams, those installed) and starts in All Apps. Adjust them in Manage Pinned Apps. Removing every app
is respected: the defaults never come back on their own. If the saved list is unreadable, the defaults are restored
with a toast.

Stored in Raycast's local storage for this extension: tracked apps (bundle ID, path, name), pins, the Trash pin,
filter, sort, recency stamps (bundle IDs and timestamps, at most 50), and a setup marker. Never stored: badge values,
window titles, window IDs. Nothing leaves your Mac.

Uninstalling the extension in Raycast removes it and its storage. Nothing else is installed: no LaunchAgent, login
item, or background process.

## How it works

Two small Swift helpers in `assets/` run on demand while the list is open, each with `execFile`, no shell, and a hard
timeout. No helper process exists while the list is closed.

| Helper | What it reads | Source | Build |
| --- | --- | --- | --- |
| `assets/window-helper` | Windows of running apps (Accessibility), their Desktop, and focus | `helper/window/*.swift` | `npm run build:helper:window` (`swiftc -O -swift-version 5 -target arm64-apple-macos14`, Swift 6.4) |
| `assets/dock-badges` | Dock items and their badge text (Accessibility) | `helper/badge/dock-badges.swift` | `npm run build:helper:badge` (`swiftc -O -target arm64-apple-macos14`) |

The source hashes are recorded in `helper/window/SOURCES.sha256` and `helper/badge/dock-badges.swift.sha256`, and
`npm test` fails if a committed binary or a Swift source differs from the recorded values. Rebuilding from these
sources with the commands above reproduced both binaries byte for byte.

**Undocumented macOS interfaces.** The window helper resolves eight undocumented symbols at runtime with `dlsym`, all
listed with their purpose in `helper/window/PrivateAPI.swift`: `_AXUIElementGetWindow` (window IDs),
`_AXUIElementCreateWithRemoteToken` (windows on other Desktops), `SLSMainConnectionID`, `SLSCopySpacesForWindows`,
`SLSCopyManagedDisplaySpaces`, `SLSManagedDisplayGetCurrentSpace` (which Desktop a window is on),
`_SLPSSetFrontProcessWithOptions` and `GetProcessForPID` (a fallback when normal activation does not bring the app
forward). The badge helper reads the Dock's undocumented `AXStatusLabel` attribute. If a future macOS removes any of
them, the affected read fails with a clear reason instead of a wrong result. AltTab and devadathanmb's Window Switcher
(both GPL) were read as documentation for these interfaces only; no code from them is included.

## Development

```bash
npm install
npm run dev         # imports the extension into Raycast
npm test            # node --test, pure logic and fake helpers (no Raycast needed)
npm run typecheck
npm run lint        # ray lint
```

`scripts/measure.sh` times the installed helpers from a terminal that has Accessibility; `scripts/count-helpers.sh`
counts helper runs with `pgrep`. `build` and `dev` never compile Swift; rebuild a helper only when its source changes.

## License

MIT. Copyright Bret Morin (`bretbuilds`).
