# Beeper Changelog

## [Prepare for Publish & Partial Self-hosted LINE Bridge Support] - {PR_MERGE_DATE}

- Self-hosted bridge support with "Self-hosted" tag on accounts
- LINE messaging service support
- Improved account detection and labels across all commands

## [Initial Version] - 2025-02-25

### Added

- Recent Chats command with filtering, search, and chat detail view
- Unread Chats command for quick unread message overview
- Contacts command with cross-account search
- Search Recent Messages command with sender/date filters
- Connected Accounts command to view linked messaging services
- Open Beeper no-view command to bring Beeper Desktop to foreground
- AI tools: open-chat, send-message, list-accounts, search-messages, summarize-unread, summarize-messages
- PKCE OAuth authentication with Beeper Desktop API
- Local chat indexing with Fuse.js for fast fuzzy search
- Mock data mode for demos and screenshots
- Chat actions: send messages, reply, archive, set reminders, copy links
- Message attachments: upload files and images
- Frecency-based chat sorting
