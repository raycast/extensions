# Xquik for Raycast

Search X (Twitter) data from Raycast with your Xquik API key.

Xquik is the world's fastest and cheapest X Twitter data API with the most complete X data. Most other Twitter APIs charge per request, even for empty pages & errors. Xquik charges only for delivered, unique, filter-matching results and never pads rows.

Xquik is an independent third-party service. Not affiliated with X Corp. "Twitter" and "X" are trademarks of X Corp.

## Set up

1. Sign up at [xquik.com](https://xquik.com) with your email. You need no password.
2. Add credits or choose a plan in your Xquik dashboard.
3. Open [API Keys](https://dashboard.xquik.com/en/account?tab=api-keys) & create a key. Copy it right away.
4. Open any Xquik command & paste the key into **Xquik API Key**.

Raycast keeps the key in its encrypted local store. The extension sends it only to xquik.com.

## Commands

- **Search Posts** finds public posts of any date. Press Enter to run a search, so typing costs nothing. It takes [X search operators](https://github.com/Xquik-dev/x-twitter-advanced-search) such as `from:` & `since:`.
- **Advanced Search** filters posts by author, mention, language, dates, likes, reposts & media.
- **Search Users** finds accounts by name or username.
- **Get User Profile** shows an account's counts, bio, links & contact details.
- **Get User Posts** lists an account's latest posts, newest first.
- **Get User Mentions** lists public posts that mention an account.
- **Get Post** opens 1 post from its link or ID.
- **Get Post Replies** lists the replies to a post.
- **Check Follow** shows whether 2 accounts follow each other.
- **View Trends** lists what's trending in 16 places.
- **Manage Monitors** creates, pauses & deletes account and keyword monitors.
- **View Monitor Events** lists the latest posts & changes your monitors found.

Each post opens in a detail view. From there you can open it on X, read its replies, thread & quotes, open its author, copy its text or link, and save its media.

Commands take a username, an @username or a profile link. Post commands take a post link or ID.

## Search with operators

Search Posts takes X search operators. Type a query like this one.

```text
"twitter api" min_faves:10 since:2026-10-01
```

## Raycast AI

Mention Xquik in Raycast AI to ask about X (Twitter) data in plain words. Its 14 tools search posts & users, read profiles, posts, replies & threads, check follows, read trends and manage monitors. Raycast asks you to confirm before a tool creates or deletes a monitor.

## Prices

- Posts, profiles & replies cost 1 credit each, from $0.00015.
- A trends list costs 1 credit.
- An active monitor costs 30 credits an hour, events included.

You pay only for the rows you get. Read the plans at [xquik.com](https://xquik.com).

## Limits

- Reads return public data only.
- A protected account's posts stay private.

## Support

Email support@xquik.com or read the docs at [docs.xquik.com](https://docs.xquik.com).
