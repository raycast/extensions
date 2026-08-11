# Orion

Manage your [Orion](https://orionbrowser.com) browser from Raycast: search open tabs, bookmarks, history, and reading list, switch profiles, and use a unified **Command Bar**.

## Commands

- **Command Bar**: an Arc-style unified palette. Search open tabs, bookmarks, reading list, history, and the web from one place, with live search-engine suggestions. Results open in Orion.
- **Search Tabs**: switch between your open Orion tabs.
- **Search Orion Bookmarks**, **Search Orion Reading List**, **Search Orion History**: browse each, filterable by profile.
- **Search Profiles**: open one of your Orion profiles.

## Use the Command Bar as Orion's new-tab page (Arc-style)

You can make a new Orion tab open the Command Bar, similar to Arc's command bar:

1. Get the Command Bar's deeplink. In Raycast, find **Command Bar**, press `⌘K`, and choose **Copy Deeplink**. It looks like `raycast://extensions/plonq/orion/command-bar`.
2. In Orion, open **Settings → General** and set **Homepage** (and, if you want every new tab to use it, **New tabs open with → Homepage**) to that deeplink.

Now opening a new tab (or pressing the home button) launches the Command Bar. When Orion hands off to Raycast it leaves a blank tab behind; the Command Bar automatically closes those leftover tabs when you open a result. You can turn this off with the **Auto-close launcher tabs** preference.

Prefer a keyboard shortcut instead? Assign a hotkey to **Command Bar** in Raycast (Settings → Extensions → Orion → Command Bar) and trigger it from anywhere.

## Preferences

- **Search Engine**: engine used for the Command Bar's live suggestions and web-search fallback (DuckDuckGo, Google, Brave, or Kagi).
- **Auto-close launcher tabs**: when using the deeplink-as-homepage setup above, close the blank tabs Orion leaves behind. On by default.
- **Use Release Candidate**: read from `Orion RC` instead of `Orion`.

## Notes

- The **History** command (and the History section of the Command Bar) reads Orion's local history database, which requires granting **Full Disk Access** to Raycast in macOS System Settings. If it is not granted, history is simply omitted.
