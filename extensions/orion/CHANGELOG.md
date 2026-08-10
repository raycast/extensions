# Orion Changelog

## [Command Bar] - 2026-06-22

- Add a "Command Bar" command — an Arc-style unified palette that searches open tabs, bookmarks, reading list, history, and the web from one place. Shows a top hit, a "Search the Web" action, live search-engine autocomplete, and per-source sections. Includes a profile switcher (search bar accessory) and a Search Engine preference (DuckDuckGo, Google, Brave, or Kagi). Results open in Orion rather than the system default browser.
- When you open a result from the Command Bar, it auto-closes the blank "launcher" tabs Orion leaves behind if you set its homepage / new-tab to the Command Bar deeplink (`raycast://…`). Controlled by the "Auto-close launcher tabs" preference (on by default); never closes a window's last tab.

## [Fix Search Tabs] - 2026-06-21

- Fix "Search Tabs" showing no tabs on current Orion versions. Orion's AppleScript bridge no longer resolves `URL`/`name` getters on the individual tab objects returned by `window.tabs()`; the failure was silently swallowed, leaving the list empty. Switched to bulk property access (`window.tabs.url()` / `window.tabs.name()`) for listing tabs and indexed tab specifiers (`window.tabs[i]`) for opening and closing them.

## [Profile Support] - 2023-09-07

- Support filtering by profile when searching for bookmarks, history, and reading list. Tabs are not supported.

## [Tab search] - 2023-03-16

- Adds ability to search your open tabs
  - Caveat: Orion only exposes tab title and URL, so if you have duplicate tabs,
    it will only display and activate the first one

## [Release Candidate support] - 2023-02-06

- Adds option to use the release candidate version of Orion ("Orion RC")

## [Initial Version] - 2022-09-07
