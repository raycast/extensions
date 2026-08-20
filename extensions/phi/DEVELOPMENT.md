# Phi for Raycast

This extension searches and controls live Phi Spaces and tabs through Phi's native AppleScript dictionary. Search History reads Phi's local Chromium `History` databases directly. It does not read cookies, credentials, page content, or other browser data.

Live Phi commands use macOS Automation permission. History queries run locally.
Phi Stable 2.4.0 or later is required. Phi Canary skips semantic version checks but must support scripting API version 1.

## Commands

- Search Spaces
- Search History
- Search Tabs
- Search Current Space Tabs
- Phi Actions
- Open New Tab
- New Window
- New Incognito Window

Tab actions include activate, close, reload, and copy URL. All tab mutations use both the owning window ID and tab ID.
Phi Actions provides Manage Extensions, Refresh the Page, Force Refresh the Page, and Add Split View for the active Phi page.
Incognito windows can be created, but their Spaces and tabs are intentionally excluded from search results.
HTTP and HTTPS results use the user's configured Raycast favicon provider. Internal, missing, and invalid URLs use the built-in Globe icon. Visible URL subtitles show only the host; search, copy, and open actions retain the complete URL.

### Search History

Search History finds previously visited pages by title or URL across all local Phi profiles. It merges up to 200 results in most-recently-visited order, shows the last visit time, and labels the profile when results come from multiple profiles. From a result, you can open the page in Phi, copy its URL, or refresh the history list.

History searches run locally against Phi's Chromium `History` databases, and search terms are used only in local SQLite queries. Opening a result passes only the selected URL to Phi.

The extension discovers profiles from Chromium's `Local State` and existing `History` files. When the selected Phi application is running, it asks Phi for the active Chromium data directory. Otherwise, or when that command is unavailable, it falls back to `~/Library/Application Support/com.phibrowser.Mac` for Stable or `~/Library/Application Support/com.phibrowser.canary.Mac` for Canary.

Open New Tab accepts optional inline `URL` and `Space` arguments. Leaving `URL` blank opens the new-tab page, and leaving `Space` blank uses the current window's current Space. Space accepts a Space name, `Space — Profile`, or an opaque Space ID.

## Development

1. Build and run a Phi Canary build with scripting API version 1.
2. Run `npm install`.
3. Run `npm test`, `npm run lint`, and `npm run build`.
4. Run `npm run dev` and open a Phi command from Raycast.

The extension defaults to stable Phi. Select **Phi Canary** in the extension preferences for local development.

Each command declares its minimum supported Phi Stable version in `src/command-compatibility.ts`. Operations that call Phi execute through `runPhiCommand` or `runPhiCommandAction` so unsupported Stable versions receive the standard upgrade message. Search History keeps its database query local and applies the version check only when opening a selected result in Phi. Canary ignores these semantic-version floors.
Each item in Phi Actions also declares its own `minimumPhiVersion` and executes through `runPhiAction`, allowing actions added to the same command to require different Phi versions.

Every AppleScript request includes a versioned client context with the Raycast command, optional action, and one random invocation ID per user operation. Phi uses this only for privacy-minimal product analytics. It does not include URLs, titles, Space/tab/window IDs, or raw arguments, and it is not an authorization mechanism.

On first use, macOS asks whether Raycast may automate Phi. If access was denied, enable Raycast under **System Settings > Privacy & Security > Automation**.

Before publishing, verify that scripting API version 1 is available in the minimum supported stable Phi release and replace the provisional Raycast author value with the publisher's Raycast username.
