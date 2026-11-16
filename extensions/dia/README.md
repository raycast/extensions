# [Dia](https://diabrowser.com) - An AI-powered browser from the makers of Arc

Search and quickly navigate your Dia browser's history and bookmarks on macOS and Windows. On macOS, you can also search and control live tabs and spaces. Open results in Dia or other browsers, or copy websites to share them.

## 🔍 Unified Search Command

Use a single unified search command. Use this to search for pinned tabs, open tabs, history items, and get Google suggestions for your search queries. Use the dropdown menu to filter your search to a specific category.

> **💡 Pro Tip:** Assign a global hotkey to the "Search" command to use it even quicker, e.g. "⌘ + ⌥ + L".

## 🚀 Features

- Use the Search History command to browse your previously visited websites
- Use the Search Tabs command to search and switch between open and pinned tabs from every Dia space. Tabs are grouped by space with the space name or a dot in its color on every row (choose in the Space Label preference), ⌘P filters by space, and ⌘K offers "Switch to Space" actions
- Use the Search Extensions command to search Dia's extensions and open them in the current space. It picks the extension from Dia's Extensions menu (Raycast needs Accessibility access) and falls back to opening the extension's popup in a tab
- Copy websites in different formats such as URL or Markdown to quickly share them
- Create new regular and incognito windows

## 📦 Requirements

- macOS: Dia Version 1.7.0 or higher
- Windows: Raycast for Windows and Dia installed for the current Windows user

## Windows support

Search Dia, Search History, Search Bookmarks, Search Extensions, and Open URL in Dia are available on Windows. The extension discovers the packaged Dia browser data under `%LOCALAPPDATA%\Packages\TheBrowserCompany.Dia_ttt1ap7aakyb4\LocalCache\Local\Dia\User Data`, with `%LOCALAPPDATA%\Dia\User Data` as a fallback. It opens links using Dia's Windows app ID, without changing your default browser.

An experimental PowerShell backend uses Windows UI Automation for Search Tabs, focusing/closing tabs, reading page text, listing/switching spaces, New Tab, New Window, and New Incognito Window. Dia must already be open with its sidebar visible. The macOS version requirement does not apply on Windows. The helper runs without a console window, respects the system's PowerShell script policy, and times out after 15 seconds. It does not enable remote debugging or install a browser extension.

Windows limitations:

- Tab search covers each window's **active space only**. Switch spaces before searching another space. Inactive-space controls are virtualized by Dia; the backend does not switch spaces behind your back to enumerate them.
- Only the selected tab exposes its URL. Other tabs are searchable by title. Pinned state is unavailable, so Windows omits the pinned-tab filter and currently reports `isPinned: false` (unknown, not proof that the tab is unpinned).
- Reading a tab or closing it first selects it and brings Dia forward. Page reading uses accessibility text, not JavaScript, and cannot reliably report loading state. Wait for the page to load before reading it.
- UI Automation tab IDs are temporary. If Dia rebuilds the sidebar or restarts, refresh results before acting. Stale IDs fail rather than selecting another tab with the same title.
- Window creation with a specified profile is not supported. Basic creation currently matches English menu labels.
- Dia UI changes can require updating the helper. Ambiguous controls and unsupported layouts return errors instead of guessing.

Search Extensions reads installed extensions from all discovered profiles. On Windows, opening an extension uses its popup URL (or settings page) in Dia's current profile; selecting a specific profile or invoking its toolbar popup is not supported.

### Local development on Windows

Run `npm ci`, then `npm run dev` from this folder with Raycast installed. Use the development commands in Raycast to try searching history and bookmarks and opening a result in Dia. Run `npm run build`, `npx tsc --noEmit`, and `node --test tests/*.test.cjs` to validate changes.

To run the read-only PowerShell spike against your installed Dia:

```powershell
$request = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('{"operation":"spaces"}'))
powershell.exe -NoProfile -NonInteractive -Sta -File assets/windows-automation.ps1 -RequestBase64 $request
```

Other read-only operations are `tabs` and `focused-tab`. Output can contain tab/space names; review it before sharing. The development-only control inspection operation has been removed from the shipped helper. Live smoke tests verified tab/space listing, stable IDs across consecutive helper calls, page-text reading, space switching and restoration, regular/incognito window creation, and opening/closing a disposable test tab. This is not a guarantee across all Dia versions or layouts.

If Raycast still reports "AppleScript is only supported on macOS", check which extension copy it is loading. The CLI can build into `%USERPROFILE%\.config\raycast-x\extensions\dia` while an existing installation loads `%USERPROFILE%\.config\raycast\extensions\dia`. Building successfully does not update both copies. Back up the installed extension before targeting that directory explicitly:

```powershell
npx ray build --output "$env:USERPROFILE\.config\raycast\extensions\dia"
```

Close and reopen the command after rebuilding. If it still uses the previous bundle, restart Raycast to clear the loaded extension.
