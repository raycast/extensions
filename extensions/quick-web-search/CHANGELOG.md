# Quick Search Changelog

## [Custom Engines & Multi-Search] - {PR_MERGE_DATE}

- Added custom search engines support (add, edit, and delete with custom query and suggestion URLs)
- Added Multi-Search mode to query multiple search engines simultaneously (`⌘M` / `Ctrl+M`)
- Added Multi-Search configuration view to select engines and set tab opening order (`⌘⇧M` / `Ctrl+Shift+M`)
- Added engine management view accessible directly from search actions
- Standardized cross-platform keyboard shortcuts for macOS and Windows
- Fixed custom engine persistence and fallback preference resolution

## [Initial Release] - 2026-07-15

- Quick Search command with Perplexity, Google, Google AI Mode, DuckDuckGo, Bing, and YouTube support
- Search bar engine dropdown with persisted selection and default-engine preference
- Live autocomplete suggestions (keyless Google / DuckDuckGo endpoints)
- Optional on-device recent-search history with remove and clear actions
- Open With actions to run a query on any other engine
- Fallback command and `query` argument support
