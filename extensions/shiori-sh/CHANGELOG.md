# shiori.sh Changelog

## [AI Tools and Pagination] - {PR_MERGE_DATE}

- Add AI tools to save bookmarks with confirmation, search saved links, and find unread links about a topic.
- Support documented starred, tag, saved-since, read-status, and sort filters in AI search.
- Browse past the first 100 links, cancel outdated searches, and recover from page errors without losing loaded links.
- Refresh pagination after bookmark changes and distinguish request errors from empty results.
- Validate save URLs and handle minimal save responses, timeouts, and authentication errors without exposing API keys.

## [0.1.2] - 2026-03-09

- Add server-side search with debounce, replacing client-side filtering
- Fix `Link` type to match public API (remove `favicon_url`, add 7 new fields: `deleted_at`, `hn_url`, `file_type`, `file_mime_type`, `notion_page_id`, `author`, `discoverable_feed_url`)
- Include `link` object in create, update, and delete response types
- Show author in link detail metadata

## [0.1.1] - 2026-03-03

- Add action to update link details

## [Initial Version] - 2026-02-26
