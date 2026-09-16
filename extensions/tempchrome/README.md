# TempChrome

Launch Chromium with a temporary, isolated profile. Each launch gets a fresh profile directory, so no cookies, history, logins, or extensions carry over from your normal browser.

Use it to test a web app as a new user, open an untrusted link, or sign in to a second account without a profile switch.

## Requirements

- macOS
- Chromium

You do not need to install Chromium yourself. Open the **TempChrome** command and select **Install or Update Chromium…**. The extension downloads the latest official Chromium snapshot for your Mac and installs it.

The extension picks the correct build for your Mac. Apple Silicon gets `Mac_Arm`. Intel gets `Mac`.

## Commands

### Quick Launch TempChrome

Creates a temp profile and opens Chromium at once. There is no user interface. Bind a hotkey to this command for a one-key launch.

This command reads its flags from its own preferences. Set them one time in the Raycast preferences pane.

### TempChrome

Opens a list with these actions:

| Action | Shortcut | What it does |
| --- | --- | --- |
| Launch Now | `↵` | Launch with the default options |
| Launch with Options… | `⌘L` | Pick flags in a form, then launch |
| Recent Launches… | `⌘R` | Replay a recent configured launch |
| Manage Temp Profiles… | `⌘M` | List, relaunch, or delete profiles |
| Install or Update Chromium… | `⌘I` | Download and install Chromium |

In **Manage Temp Profiles…**, press `⌘L` on a profile to live-tail its Chromium log.

## Launch options

You can set these in the **Quick Launch TempChrome** preferences, or in the **Launch with Options…** form:

- **Auto-Cleanup** — delete the profile after the Chromium window closes. On by default.
- **Start URL** — open this page instead of the new tab page.
- **Browsing Mode** — normal or incognito.
- **App Mode** — open the start URL as a standalone window, with no tabs or address bar. Needs a start URL.
- **Window State** — normal, maximized, fullscreen, or kiosk.
- **Window Size** and **Window Position** — the first window geometry.
- **Disable Web Security** — turn off the same-origin policy. Use with care.
- **Ignore Certificate Errors** — accept bad TLS certificates. Use with care.
- **Disable Extensions**
- **Auto Open DevTools**
- **Remote Debugging Port** — for tools that attach over the DevTools protocol.
- **User Agent**, **Proxy Server**, **Language**
- **Custom Args** — any other Chromium flags.

The two places hold separate values. The form resets to the defaults each time you open it. It does not write back to the preferences pane.

## Extension preferences

- **Chromium Install Directory** — the folder that holds `Chromium.app`. Default `~/Applications`. The bundle name is always `Chromium.app`.
- **Temp Profile Base Directory** — where profiles are created. Default `/tmp/tempchrome_profile`.

## Where profiles live

Each launch creates `<Temp Profile Base Directory>/<random-id>`. The id is 10 random characters.

Every launch also writes `<profileDir>/chrome_debug.log`.

With **Auto-Cleanup** on, the extension deletes the whole directory after Chromium closes. This removes the log too.

With **Auto-Cleanup** off, the profile stays on disk. Use **Manage Temp Profiles…** to see the size of each profile and to delete the ones you do not need.

## Notes

- Profiles live in `/tmp` by default. macOS may clear `/tmp` on restart.
- Chromium is a separate browser from Google Chrome. This extension does not touch your Chrome profiles.
