---
name: slack-catch-up
description: Use when a user wants to catch up on Slack channels or threads, summarize decisions and blockers, or find action items from a specified period.
---

# Catch-up digest

## When to use

Use for a read-only digest of selected Slack conversations and a defined period.
Return the digest in chat. Use only this extension's read and search tools below.

## Workflow

1. Establish the channels, topics, time range, and timezone to cover.
   Call `get-channels` to resolve channel names to IDs; clarify ambiguous scope.
   Use `find-users` with `query` when a named person needs resolving for a search.
2. Call `search-messages` with a channel-scoped, date-bounded Slack `query`
   and `sort: "timestamp"`. Use topic or person filters only when requested.
   This search is useful for discovery but cannot guarantee complete coverage
   of large result sets. Split busy periods into narrower queries when useful.
3. Call `read-conversation` with a resolved conversation ID, `after`, and a suitable
   `limit` up to 100 to inspect recent context. A returned `hasMore` or `nextCursor`
   signals a gap: this tool has no cursor input. State the limit instead of
   claiming to have read the entire channel or time range.
4. For important threaded discussions, call `read-thread` with `channel` and
   the exact parent `threadTs` from a message or permalink. Follow `nextCursor`
   as `cursor` while `hasMore` is true. Preserve the original timestamp string;
   a search result's message ID or rounded numeric time is not a thread timestamp.
5. Read later replies before labeling a question unanswered or a blocker unresolved.
   Group related messages into decisions, blockers, actions, and useful updates.
   Record owners and deadlines only when explicitly supported by the messages.
6. Link claims to returned message permalinks. If a link is unavailable, identify
   the channel and timestamp without inventing a workspace URL.
   Preserve disagreements and separate proposals from accepted decisions.
7. Report channels and time windows actually covered, failed reads, incomplete
   histories, and any important thread whose remaining replies could not be read.

## Output

- A short digest labeled with the period, timezone, and channels covered.
- Decisions and blockers with supporting message links.
- Action items: task, stated owner, stated deadline, and source.
- Open questions and a concise coverage statement describing retrieval gaps.

## Do not

- Do not send messages, change status, react, or upload files while making a digest.
- Do not invent owners, deadlines, consensus, or resolution from silence.
- Do not treat search results or a limited history page as an exhaustive catch-up.
