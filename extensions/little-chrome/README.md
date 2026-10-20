# Little Chrome

Open any URL or Google search in a small, chromeless Google Chrome window — like Little Arc, but for Chrome.

The window has no address bar, tab bar or bookmarks bar, uses your normal Chrome profile (so you stay signed in), and can be moved, resized and closed like any other window. Open as many as you like.

## Commands

- **Open Little Chrome** — type a URL or search terms and press Enter. Your Chrome history (with favicons) is listed below the search bar, ranked by how often and how recently you visited each page. The top history match is selected; press ↑ to open exactly what you typed instead.
  - Input with a scheme (`https://…`, `chrome://…`) is opened as is.
  - Domains and IP addresses get `https://`; `localhost`, `127.0.0.1`, `*.localhost` and `*.test` get `http://`.
  - Anything else becomes a Google search.
  - Press ⌃X on a history item to hide it from suggestions, or ⌃⇧X to hide every page from that site. Hidden items are kept per Chrome profile and are never deleted from Chrome's history. Use **Manage Hidden Suggestions** to review and unhide them.
- **Open URL in Little Chrome** — opens the URL or search terms given as its argument right away, without the suggestion list. Handy in Quicklinks and deeplinks, e.g. a Quicklink with this link opens Google Translate in a Little Chrome window:
  ```
  raycast://extensions/tompenguin/little-chrome/open-url?arguments=%7B%22url%22%3A%22https%3A%2F%2Ftranslate.google.com%2F%3Ftext%3D{Query}%22%7D
  ```
- **Open Little Chrome in Tab** — moves the focused Little Chrome window into a new tab of your frontmost normal Chrome window (or a new window if none is open).
- **Manage Hidden Suggestions** — lists the pages and sites hidden from suggestions for the current Chrome profile; unhide them one by one or all at once.
- **Copy Chrome URL** — copies the URL of the focused Chrome window, including Little Chrome windows that have no address bar.

Assign hotkeys to the commands in Raycast Settings → Extensions → Little Chrome. You can also set **Open Little Chrome** as a fallback command to open whatever you typed in the root search.

The initial window size (900×700 by default) can be changed in the extension preferences.

## Setup

On first use macOS asks whether Raycast may control Google Chrome (and System Events for the window commands). Allow it. If you denied it, enable it in System Settings → Privacy & Security → Automation → Raycast. Without this permission windows still open, but at Chrome's default size.

## How It Works

Windows are opened with Chrome's `--app=<url>` flag, which a running Chrome forwards to its existing process and profile. Chrome ignores `--window-size` in that case, so the new window is resized via AppleScript. History and favicons are read from snapshot copies of Chrome's local `History` and `Favicons` databases; nothing is sent over the network.

## Limitations

- Uses the last used Chrome profile.
- New windows open where Chrome places them, so several windows may stack on top of each other.
- **Open Little Chrome in Tab** reloads the page (form input and scroll position are lost). To keep page state, use **Open in Chrome** from the ⋮ menu in the window's title bar instead. It only recognizes windows opened by this extension.
- Google Chrome (stable) only; Chrome Beta, Canary and Chromium are not supported.
