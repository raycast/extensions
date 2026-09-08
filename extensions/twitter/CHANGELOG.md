# X Changelog

## [OAuth, New Commands, and AI Tools] - {PR_MERGE_DATE}

- Use Raycast-owned OAuth 2.0 PKCE credentials with automatic token migration and refresh recovery
- Add recent post search, bookmarks, user profiles, and posting selected text
- Add thread composition with persistent drafts that survive failed publishes
- Add cached, explicitly paginated reads with typed API errors and rate-limit handling
- Add confirmed AI tools for searching posts, reading the timeline, publishing, and looking up users
- Add AI tools for bookmarks, personal posts, replies, deletion, likes, and reposts
- Add AI search across the authenticated user's retrievable post and reply history
- Add AI connection search to resolve remembered names through following or followers
- Add AI follower and following lists for specified accounts and follow verification that keeps incomplete checks unverified
- Add chunked v2 uploads for images, GIFs, and video in posts, threads, replies, and direct messages
- Add quote posts, polls, and per-post reply settings to the composer and AI posting tool
- Show public post metrics plus private 30-day impressions, clicks, and video analytics
- Add mentions triage and paginated like, repost, and quote engagement lookups
- Add bookmark writes, bookmark folders, and hide or unhide reply actions
- Add confirmed 1:1 and group direct messages with one optional media attachment
- Show user search results inside Raycast with exact username and connection matching
- Use Raycast icons throughout post lists and make the details pane toggleable
- Improve empty and error states, and use platform-appropriate keyboard shortcuts
- Remove the obsolete X API v1 implementation and custom client ID preference

## [Modernize] - 2025-10-13

- Remove `node-fetch`
- Modernize extension to use latest configuration

## [Add Windows Support] - 2025-09-03

## [X compatible] - 2023-01-21

- Restore core X features

## [Add v2 support] - 2022-06-28

- Add OAuth support
- Add support for X API v2
- Add Metadata view for posts

## [Show Posts directly in the List View] - 2022-05-02

- Posts will be shown directly in the List View (can be disabled)
- Add support for Post Threads
