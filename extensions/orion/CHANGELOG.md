# Orion Changelog

## [Command Bar] - 2026-09-25

- Stop the Command Bar's loading indicator from flickering on every keystroke. History and search-suggestion lookups re-run as you type and briefly report loading, but by the time either can be true, tabs/bookmarks/profiles have already resolved, so there was no genuine "nothing to show yet" state being reflected - just a distracting flash.

## [Command Bar] - 2026-09-24

- Always return to Raycast's root search immediately after opening a Tab, Bookmark, Reading List item, History entry, or address from the Command Bar, regardless of the "Pop to Root Search" preference. Previously, a delayed preference could leave the Command Bar's background process lingering instead of resetting, so reopening it soon after could show a tab list that had not picked up a change made directly in Orion in the meantime.

## [Command Bar] - 2026-09-24

- Keep Open Tabs current while the Command Bar stays open: poll for tab changes at a modest cadence so opening or closing a tab directly in Orion is reflected without a manual refresh, and update the cached "Current Tab" immediately after switching to a tab from the Command Bar instead of waiting for the next poll. The standalone Search Tabs command is unaffected.

## [Command Bar] - 2026-09-23

- Fix typed web address detection recognizing a bare public suffix (e.g. `goog`, `abc`, `app`, `dev`, `github.io`, `co.uk`) as an address. Several brand-owned gTLDs are themselves ordinary words or common file extensions, so a one-word search query could land exactly on a real ICANN or private suffix with no domain label in front of it. Require an actual domain (a label plus the suffix, e.g. `goog.com`) before accepting a bare host as an address; an explicit `http://`/`https://` scheme is unaffected.

## [Command Bar] - 2026-09-23

- Fix a Top Hit race with fast typing: `useSQL` intentionally keeps its previous history result set visible while a new query runs, but that stale result set could still be scored for Top Hit against the query text currently in the search bar. Track the history query that actually completed and exclude stale history results from Top Hit ranking until the matching result arrives, while still keeping them visible in the History section to avoid unnecessary list reflow.

## [Command Bar] - 2026-09-23

- Fix typed web address detection: a bare number like `1` was misrecognized as an address (Node's URL parser coerces it to an IPv4-looking hostname), a non-canonical IPv4 octet like `192.168.001.1` was accepted as valid, and bracketed IPv6 literals were not recognized at all. Also trust an explicit `http://`/`https://` scheme for single-label hosts (e.g. an internal hostname with no public TLD) instead of requiring it to pass Public Suffix List validation.

## [Tabs] - 2026-09-22

- Track each open tab's window-local index and whether it is Orion's current tab. Open Tabs (Search Tabs and Command Bar) now shows a "Current Tab" label, keeps duplicate URLs as separate entries instead of silently collapsing them, and switching to a tab addresses it by that stable index rather than a title/URL scan.
- Add a "Refresh Open Tabs" action (⌘R) to Open Tabs results.
- Escape tab title/URL correctly when building the AppleScript that switches to a tab, instead of an unescaped template literal.

## [Command Bar] - 2026-09-22

- Add a configurable limit for live search suggestions; setting it to zero hides suggestions and prevents suggestion requests.
- Add fuzzy and pinyin matching as a labeled fallback for open tabs when there is no exact local tab match. Fallback matches are not eligible for Top Hit.

## [Command Bar] - 2026-09-21

- Improve Top Hit ranking with deterministic match tiers and source precedence: open tabs, bookmarks, reading list, then history. Deduplicate matching destinations and use history frecency only to resolve ties within history.
- Keep Top Hit selected as local sources resolve, while preserving an explicit Ctrl+N/Ctrl+P selection when later results arrive.
- Reset the selection session whenever the query or profile changes, so deleting or appending text cannot leave Web Search focused after a prior candidate disappears.
- After the first Ctrl+N/Ctrl+P navigation, release selection to Raycast's native list so repeated navigation remains smooth while later results do not steal focus.
- Recognize typed web addresses and offer opening them in the system default browser. Add the same default-browser action to local Orion results.

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
