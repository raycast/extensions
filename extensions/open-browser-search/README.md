# Open Browser Search

Search any website and choose which browser opens the results. A [Raycast](https://raycast.com) extension that combines universal website search with browser selection.

Based on [Universal Website Search](https://www.raycast.com/pernielsentikaer/any-website-search) by pernielsentikaer, with the addition of per-site and global browser preferences.

## Features

- Search any configured website with autocomplete suggestions (Google or DuckDuckGo)
- Choose which browser opens the results via an action panel submenu
- Set a global default browser or assign a preferred browser per site
- Direct URL detection — type a URL to open it directly instead of searching
- Manage saved search sites: add, edit, delete, and set a default
- Pre-fill the search field from clipboard text
- DuckDuckGo bang stripping for cleaner suggestions
- Favicon display for saved sites

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Open in preferred/default browser |
| `Cmd+B` | Open in a specific browser (submenu) |
| `Cmd+Shift+C` | Copy the search URL |
| `Cmd+,` | Manage saved sites |
| `Cmd+N` | Add a new site (in Manage view) |
| `Ctrl+X` | Delete a site |

## Preferences

| Preference | Type | Description |
|------------|------|-------------|
| **Default Browser** | App Picker | Global default browser for opening results. Leave empty for system default. |
| **Search Suggestions** | Dropdown | Autocomplete provider: DuckDuckGo (default), Google, or None |
| **Prefill from clipboard** | Checkbox | Pre-fill the search field with clipboard text on launch |
| **Strip DuckDuckGo bangs** | Checkbox | Remove DuckDuckGo bang prefixes (e.g., `!g`) before fetching suggestions |

## Browser Selection Priority

When opening a search result, the browser is chosen in this order:

1. **Per-site preferred browser** — set via "Preferred Browser" in the edit form
2. **Global default browser** — set via Raycast extension preferences
3. **System default browser** — macOS default

## Default Search Sites

The extension ships with these pre-configured sites:

Bing, DuckDuckGo, GitHub, Google, npm, Reddit, Stack Overflow, Twitter, Wikipedia (en), YouTube

Sites are stored locally and can be fully customized.

## Credits

Inspired by [Universal Website Search](https://www.raycast.com/pernielsentikaer/any-website-search) by pernielsentikaer.
