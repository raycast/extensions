# App Hopper

Find and switch between running apps, windows, and browser tabs from Raycast on macOS.

[![CI](https://github.com/chenghsj/app-hopper/actions/workflows/ci.yml/badge.svg)](https://github.com/chenghsj/app-hopper/actions/workflows/ci.yml)
[![Release notes](https://img.shields.io/badge/GitHub-Release_notes-181717?logo=github&logoColor=white)](https://github.com/chenghsj/app-hopper/releases/tag/companion-v1.0.1)
[![MIT License](https://img.shields.io/badge/License-MIT-green)](https://github.com/chenghsj/app-hopper/blob/main/LICENSE)

- Search running apps, window titles, and browser tabs in one place.
- Browse an app's windows or a browser's tabs and switch to the one you need.
- Find tabs by title or available URL, including background URLs with the Firefox/Zen companion.

## Install from Source

Requires macOS, [Raycast](https://www.raycast.com/), Node.js 24 or newer, and Apple's Command Line Tools (`xcode-select --install`) or Xcode.

```sh
git clone https://github.com/chenghsj/app-hopper.git
cd app-hopper
npm ci
npm run dev
```

This builds the native helpers and loads App Hopper into Raycast. See the [development guide](docs/development.md) for more details.

## Usage

1. Open **App Hopper** in Raycast.
2. Search by app name, window title, tab title, or website domain.
3. Use **↑ / ↓** to select a result, then press **Return**.

| Selected result | What Return does                                        |
| --------------- | ------------------------------------------------------- |
| App             | Activates the app, or lets you choose from its windows. |
| Browser         | Opens its window and tab list when available.           |
| Window or tab   | Switches directly to that window or tab.                |

Search results are grouped into **Applications** and **Tabs and Windows**. You can also open an app or browser first and search within its list.

Returning from a window or tab list keeps your search and selection. After a successful switch, reopening App Hopper starts at the main app list.

On first use, allow **Raycast** in **System Settings → Privacy & Security → Accessibility**, then choose **Check Again**. Allow Automation access if macOS asks.

### Sorting and Refreshing

Before typing, use the dropdown to arrange apps by **Recently Used** (default), **Name A–Z**, **Browsers & Apps**, or **By Space**. Your choice is remembered; searching shows matching results instead.

In **By Space**, apps on several macOS Spaces appear under **Multiple Spaces**. Apps without enough Space information appear under **Unknown Space**.

The app list appears first while browser tabs load in the background. Once you select or type, existing rows stay in place and new matches appear after them.

Press **⌘R — Refresh List** to reload and reorder results. Changing your search or arrangement also rebuilds the list. Refresh to remove results marked **No longer available**.

## Browser Support

| Browsers                                           | Tab integration                                               |
| -------------------------------------------------- | ------------------------------------------------------------- |
| Chrome, Edge, Brave, Vivaldi, Opera, Safari, Orion | Built in; no companion needed.                                |
| Firefox, Zen                                       | Accessibility fallback; optional companion for live tab URLs. |

Available tabs and URLs depend on the browser and its permissions. Without the Firefox/Zen companion, background tab URLs may be unavailable. Zen's hidden sidebar can also make its tab list unavailable.

See the [compatibility guide](docs/compatibility.md) for tested environments and known limitations.

### Firefox and Zen

Requires Firefox 142 or later, or a compatible Zen version.

1. Open **App Hopper**, select Firefox or Zen, then press **⌘K** and choose **Set up Firefox Integration** or **Set up Zen Integration**.
2. Choose **Enable Firefox Integration** or **Enable Zen Integration** and confirm installation in your browser.
3. Return to App Hopper, choose **Check Connection**, then refresh the tab list.

Install the same companion in each Firefox or Zen profile you use. Private-window access is optional and stays off by default.

Searching across all **Zen Spaces** requires a [separate local bridge](docs/zen-integration.md#local-cross-workspace-bridge). It changes Zen's startup files, requires a restart, and may need reinstalling after a Zen update. Zen Spaces are separate from the macOS Spaces used by **By Space** sorting.

For troubleshooting, updates, and removal, see the [Firefox guide](docs/firefox-integration.md) or [Zen guide](docs/zen-integration.md).

## Development

See the [development guide](docs/development.md) for project structure and checks, and [release automation](docs/release-automation.md) for companion signing and publishing.

Run `npm run preview:loading` to build and open a persistent loading-screen preview in Raycast. Confirm **Run** if Raycast asks. Press **Esc** to leave the preview; opening App Hopper normally returns to the live app list.

## License

[MIT](LICENSE)
