# Product Hunt for Raycast

Browse and discover the latest products on Product Hunt directly from Raycast, powered by Product Hunt's official API.

## Features

- View today's featured product launches with votes, comments, makers, and topics
- See detailed product information including descriptions and galleries
- When signed in: your upvote state (▲ / △) on each launch, review star ratings, daily/weekly/monthly/yearly rank, maker-reply counts, and topic follower counts
- Open launches directly in your browser
- Works without setup via a limited public feed of recent launches, or sign in with Product Hunt to unlock full data

## Sign in with Product Hunt

By default the extension shows a **limited public feed** of recent launches (names, taglines, and links only). To see today's true featured set and unlock votes, comments, makers, thumbnails, review ratings, ranks, and your own upvotes, **sign in with Product Hunt**:

1. Open **View Today's Featured Products**.
2. Run the **Sign in to Product Hunt** action (in the toast, the empty view, or an item's **Account** section).
3. Approve access in your browser. One sign-in unlocks everything.

The extension uses Product Hunt's [official OAuth (PKCE) flow](https://api.producthunt.com/v2/docs#pkce) — nothing to copy, and no secret is stored on your machine. Sign out any time from an item's **Account** section. If a sign-in is ever rejected, use **Sign in Again**.

## Notes

- When signed in, the "today" boundary follows Product Hunt's Pacific launch day, so the list matches the site. Signed out, the public feed shows the most recent launches (which may span more than one day).
- Results are briefly cached to stay within Product Hunt's API rate limits; use **Refresh** to force-fetch.
