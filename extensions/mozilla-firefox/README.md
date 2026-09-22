# Mozilla Firefox

Search and open Mozilla Firefox tabs from search query, opened tabs, bookmarks and history.

New Tab search can be configured to search from the following sources:

- Google(default)
- DuckDuckGo
- Bing
- Brave
- Baidu

Limitations:

- Open tabs come from Firefox's session file (`recovery.jsonlz4`). The list updates when Firefox checkpoints itself (about every 15 seconds), not instantly.
- Enter on an open tab focuses Firefox. It does not switch to that exact tab, and it does not open a duplicate URL.
- Shift+Enter (Edit URL in Search Bar) is available in New Tab. Search History and Search Bookmarks only filter results.
