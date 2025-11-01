# Search Router Changelog

## [Feature] - {2025-10-09}

- Added custom search engines functionality

## [Fixed & Improvements] - 2025-04-02

- Removed Kagi-specific search bangs
- Added URL validation
- Improved fallback behavior
- Updated latest Kagi bangs

## [Feature & Improvements] - 2025-03-26

- Added fuzzy search to "Browse Search Engines" for better search engine discovery
- Improved search experience with weighted results based on shortcut, name, and domain
- Added domain tags to search engine list for better visibility
- Added keyboard shortcuts for copying search engine shortcut (⌘⇧S) and domain (⌘⇧D)
- Implemented site-specific search (snaps) with new @bang (e.g., "search term @gh" to search site:github.com)
- Updated metadata images

## [Fixes & Bits] - 2025-03-25

- Migrated bangs to [Kagi's Bang](https://help.kagi.com/kagi/features/bangs.html) from DuckDuckGo's Bang
- Now supports `!chatgpt` for chatgpt and `!ppx` for perplexity and more

## [New Additions] - 2025-03-15

- Added support for opening root domain when search query is empty

## [Initial Release] - 2025-03-05

- Implemented DuckDuckGo !Bangs search functionality directly in Raycast
- Added support for searching specific websites using bang shortcuts (e.g., `!g`, `!w`, `!t3`)
- Created "Search the Web" command for handling queries with or without bangs
- Added "Browse Search Engines" command to view and manage available search engines
- Included ability to set default search engine for queries without bangs
- Made sure the extension supports Raycast Fallback Commands
