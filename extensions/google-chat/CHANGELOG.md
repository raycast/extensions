# Google Chat Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search Spaces & DMs with frecency sorting, message view, reply in thread, reactions and mark as read
- My Messages, a conversation list like Google Chat's Home: Unread (counts, mentions) and Read (paginated, by latest activity) sections, a preview of the latest message from others, "You replied" and thread markers, an All / Unread only switch (⌘U, Default View preference), and Mark as Read / Mark All as Read
- Send Message form with one searchable To field (DMs, spaces, group chats, directory people or any email), a Thread picker with recent threads, and drafts; Quick Message from root search
- @mentions in Send Message for spaces and group chats: pick members or @all, mentions go where the text says `@Name` (or at the start), with a preview
- My Messages shows the unread total in its root search subtitle, updated on every load, refresh and mark-as-read
- Unread Chat: the unread total in root search, refreshed every 5 minutes; running it opens the only unread conversation, or My Messages' unread view
- Unread counts match Chat's Home: only messages newer than your read position that are new top-level messages or replies mentioning you (unopened replies in threads you don't follow are left out)
- Search Messages with Unread, Mentions Me and Has Link filters
- Find Person in your Workspace directory
