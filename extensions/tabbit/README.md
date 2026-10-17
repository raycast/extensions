# Tabbit Raycast Extension

Open, search, and switch Tabbit Browser tabs from Raycast.

## Setup

Install Tabbit Browser on your Mac before using this extension.

The extension opens Tabbit through the app bundle identifier
`com.tab-browser.Tabbit`. History and bookmark commands read Tabbit's local
profile data from:

```text
~/Library/Application Support/Tabbit Browser/Default
```

No account, API key, or additional service configuration is required.

## Preferences

`Tabbit Version` chooses which installed Tabbit app the extension should use.
Use `Auto` if you only have one version installed. If both versions are
installed, choose the version you want Raycast to control:

- CN: `/Applications/Tabbit Browser.app`
- International: `/Applications/Tabbit.app`

`Open URL in Tabbit` includes a `Search Engine` preference. It is used when the
input is not recognized as a URL.

Supported search engines:

- Bing
- Google
- DuckDuckGo
- Brave Search
- Yahoo
- Baidu
- Sogou
- 360 Search
- Yandex
- Ecosia
- Kagi

## Commands

| Command | Description |
| --- | --- |
| New Window | Opens a new Tabbit window. |
| New Tab | Opens a new Tabbit tab. |
| New Incognito Window | Opens a new incognito Tabbit window. |
| Open URL in Tabbit | Opens a URL in Tabbit, or searches text with the selected search engine. |
| Search Tabbit | Searches open tabs, history, and bookmarks together. |
| Search Tabs | Searches open tabs and switches directly to the selected tab. |
| Search History | Searches Tabbit browsing history. |
| Search Bookmarks | Searches Tabbit bookmarks. |
