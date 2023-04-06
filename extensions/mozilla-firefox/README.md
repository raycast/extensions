# Mozilla Firefox

Search and open Mozilla Firefox tabs from search query, opened tabs, bookmarks and history.

New Tab search can be configured to search from the following sources:
- Google(default)
- DuckDuckGo
- Bing
- Brave
- Baidu

Limitations (due to limited AppleScript support in Firefox):
- When searching open tabs, the session file is read and parsed to get the list of open tabs. This means that the list of open tabs will not be updated until the session file is updated. This is done by Firefox when it checkpoints itself or when Firefox is closed.
- Selecting an open tab will result in cycling through open tabs until desired tab. This is due to the fact that AppleScript does not support opening a specific tab in Firefox.