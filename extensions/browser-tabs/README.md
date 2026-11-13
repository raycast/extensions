# Browser Tabs

Search and open tabs in Chrome, Safari, Edge, Arc, Brave, Vivaldi, Opera and Orion, etc.

## Supported Browsers

- **Safari** (WebKit-based)
- **Chrome** (Chromium-based)
- **Edge** (Chromium-based)
- **Arc** (Chromium-based)
- Other Chromium or WebKit-based browsers

## Unsupported Browsers

- **Firefox** (Gecko-based) — supported on Windows, not on macOS
- **Zen Browser** (Gecko-based) — supported on Windows, not on macOS
- Other Gecko-based browsers are not supported on macOS.

## Windows

macOS reads tabs through AppleScript. Windows has no equivalent, so tabs are read from your
running browsers with UI Automation, through a small native helper that lives in `rust/`.
Nothing extra needs to be installed. A few things differ from macOS:

- Windows doesn't expose a tab's URL, so URLs are resolved on a best effort basis: the tab
  you're looking at reports its exact URL, and background tabs are matched by title against
  your browser history. Tabs that can't be matched — private windows, browser pages like
  Settings, or a page whose title changed since you last visited it — have no URL, and the
  actions that need one are hidden for them.
- Only browsers that are running with an open window are listed. A minimized window is not
  included, because browsers stop exposing their tab strip while minimized.
- If a browser keeps tabs in workspaces, like Zen Browser's spaces, only the workspace you
  are currently in is listed.
- Firefox and Zen Browser are supported on Windows, unlike on macOS.
- Site icons come from the browser's own icon store, so they are the icons your browser has
  already downloaded and nothing is fetched while you search.
