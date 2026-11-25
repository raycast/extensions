# [Dia](https://diabrowser.com) - An AI-powered browser from the makers of Arc

Search and quickly navigate your Dia browser's history and bookmarks on macOS and Windows. Search and control live tabs and spaces on macOS and through an experimental Windows backend. Open results in Dia or other browsers, or copy websites to share them.

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

An experimental PowerShell backend uses Windows UI Automation for Search Tabs, focusing/closing tabs, reading page text, listing/switching spaces, New Tab, New Window, and New Incognito Window. Dia must already be open. For tab and space operations, the helper attempts to temporarily reveal a hidden sidebar and restore it afterward, including after errors. This requires Dia to expose a definite hidden state through its accessible toggle or a "Show sidebar" label; otherwise it asks you to show the sidebar manually. Window and tab creation do not require revealing the sidebar. The macOS version requirement does not apply on Windows. The helper runs without a console window, respects the system's PowerShell script policy, and allows up to 60 seconds for Search Tabs and 15 seconds for other commands. It does not enable remote debugging or install a browser extension.

Compatibility review (November 24, 2026): [Dia's published Windows 1.7.0 notes](https://www.diabrowser.com/changelog/windows/1-7-0) introduce customizable shortcuts, more frequent auto-archiving, and native Markdown export of tabs, profiles, and groups. The local installed package was 1.7.3.2. Tab closing now invokes the selected tab's own accessible "Close tab" button instead of assuming Ctrl+W. Selection, space switching, and closing wait for completion with a bounded timeout. Native Markdown export remains available inside Dia; this extension does not claim access to an export API. The changes have mock-based regression coverage, but live verification on this package was blocked by the computer-use environment.

Windows limitations:

- Search Tabs briefly visits each space in each readable window and restores the original space after collecting its tabs. The dropdown filters those results. Focusing a result switches its window to the tab’s space. Search Dia and the Get Tabs tool still list active spaces only.
- Only the selected tab exposes its URL. Other tabs are searchable by title. Pinned state is unavailable, so Windows omits the pinned-tab filter and currently reports `isPinned: false` (unknown, not proof that the tab is unpinned).
- Reading a tab or closing it first selects it and brings Dia forward. Page reading uses accessibility text, not JavaScript, and cannot reliably report loading state. Wait for the page to load before reading it.
- UI Automation tab IDs are temporary. If Dia rebuilds the sidebar (including when it is hidden/revealed), auto-archives a tab, or restarts, refresh results before acting. Stale IDs fail rather than selecting another tab with the same title. If repeated sidebar rebuilding invalidates results, keep the sidebar visible while using tab actions.
- Temporarily revealing the sidebar can briefly change the layout. Restoration is best effort: if Dia hangs, the helper is terminated, or accessibility becomes unavailable, hide it manually. Check the result before retrying an action after a timeout.
- Closing requires a unique, enabled English "Close tab" button inside the selected tab. Unsupported controls return an error without sending a keyboard shortcut.
- Window creation with a specified profile is not supported. Basic creation currently matches English menu labels.
- Dia UI changes can require updating the helper. Ambiguous controls and unsupported layouts return errors instead of guessing.

Search Extensions reads installed extensions from all discovered profiles. On Windows, opening an extension uses its popup URL (or settings page) in Dia's current profile; selecting a specific profile or invoking its toolbar popup is not supported.

### Local validation

Run `node --test tests/*.test.cjs` and `npx tsc --noEmit`. On Windows, also run `powershell.exe -NoProfile -NonInteractive -File tests/windows-ui.test.ps1`; these behavioral tests use fake controls and do not interact with your browser. Live validation should cover visible/hidden sidebars, a remapped Ctrl+W, stale tab results, and closing the last tab in a window.
