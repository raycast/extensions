# X for Raycast

Use X from Raycast: browse your home timeline, mentions, bookmarks, and bookmark folders; inspect post analytics and engagement; publish rich posts and threads; moderate replies; and send explicitly confirmed direct messages. The same core capabilities are available from Raycast AI.

## Authentication

The extension uses OAuth 2.0 Authorization Code Flow with PKCE. Its X client ID is built in, so you do not need to create an X developer app or paste API credentials into Raycast.

The first command that contacts X opens the X authorization page. After approval, Raycast stores the access and refresh tokens securely. Existing users will be asked to authorize once after upgrading because tokens issued to the former client are cleared automatically.

The extension requests only the permissions needed by its commands:

- Read posts and user profiles
- Read following and followers to resolve people mentioned by name and verify follows between specified accounts
- Publish, reply to, delete, like, unlike, repost, and undo reposts
- Upload media, manage bookmarks, and hide or unhide replies
- Authorize the DM access X requires before sending direct messages
- Refresh access while the connection remains authorized

Use the **Logout** action in a post's action panel to disconnect your account. This clears the saved X tokens and the extension's read cache.

## Commands

- **Recent Posts** — browse the authenticated home timeline (without replies).
- **My Posts & Analytics** — browse your posts from the last 30 days with public metrics plus private impressions, profile clicks, link clicks, and video views when X returns them.
- **Send Post** — compose a post or chained thread with up to four images, one GIF, or one video per post. The first post can instead include a poll or quote another post, and the composer controls who can reply. Draft text and media paths persist locally and are cleared only after a successful publish.
- **Search User** — find exact usernames and search your following or followers without leaving Raycast.
- **Search Posts** — search public posts from the last seven days, including X search operators.
- **Bookmarks** — browse posts saved by the authenticated account.
- **Bookmark Folders** — browse bookmark folders and the posts saved in each one.
- **Mentions** — triage posts that mention the authenticated account.
- **Send Direct Message** — send a user-confirmed 1:1 or group DM with one optional media attachment.
- **User Profile** — inspect an exact username and browse that account's recent posts.
- **Post Selected Text** — publish up to 280 characters selected in the frontmost app without opening a command view.

Lists load up to 20 posts per page. Additional pages are fetched only when you scroll for more results, and successful reads are cached for two minutes to avoid repeating billed X API requests. The details pane follows the extension preference by default and can be toggled at any time with **Option-D** from the action panel.

## Posting and media

The composer supports:

- Text-only and media-only posts
- Up to four images, one animated GIF, or one video per post
- Threads, with each post created as a reply to the preceding post
- Quote posts using a numeric post ID
- Polls with two to four options and a duration between 5 minutes and 7 days
- Reply settings for everyone, people you follow, or only mentioned users

Each post in a thread can have its own media. Polls cannot be combined with media or a quote post. X currently restricts `quote_tweet_id` creation to Enterprise API access, so self-serve accounts will receive X's plan error when attempting a quote post.

Media uses X's chunked v2 initialize, append, finalize, and processing-status flow. The extension validates X's upload limits before sending anything: 5 MB per image, 15 MB for GIFs, and 512 MB for video. Drafts retain local media paths, while the file contents are uploaded only when you publish.

## Analytics and engagement

**My Posts & Analytics** requests user-context metrics for posts from the last 30 days. Depending on what X returns for a post and its media, the details pane shows:

- Likes, reposts, replies, quotes, bookmarks, and public impressions
- Private impressions, profile clicks, and link clicks
- Video views and playback starts

Every post action panel can open the users who liked or reposted it and the posts that quote it. It can also add or remove a bookmark, quote or reply to the post, and hide or unhide a reply. X only permits reply moderation in conversations started by the authenticated user.

The **Bookmarks** command lists all saved posts. **Bookmark Folders** lists existing X bookmark folders and the posts inside each folder; the current X API exposes folder lookup but not folder creation or moving bookmarks between folders. X returns only post IDs for a folder, so opening a folder page uses one additional batch lookup for its post details. Unavailable posts are skipped without discarding the folder's continuation token.

## Direct messages

**Send Direct Message** accepts usernames or numeric user IDs. One recipient sends a 1:1 DM; multiple recipients create a group conversation. A message can contain text, one image, one GIF, one video, or text plus one attachment.

Raycast shows the resolved recipients and exact message in a confirmation dialog before sending. The AI tool requires explicit numeric recipient IDs and must not be used for unsolicited, bulk, or recurring outreach. Only message recipients who have clearly indicated that they want to hear from you. X may still reject delivery based on a recipient's privacy settings.

## Raycast AI

The extension provides tools to:

- Search recent posts
- Search the authenticated user's retrievable post and reply history
- Search following or followers for a person mentioned without an exact username
- Read one page of the authenticated timeline
- Read one page of bookmarks or the authenticated user's own posts
- Look up a profile, optionally with one page of recent posts
- List one page of followers or following for any specified accessible account
- Verify whether one specified account follows another, preserving incomplete or failed checks as unverified
- Publish a post or reply
- Publish a chained thread; attach media, quote a post, create a poll, and set who can reply
- Delete an owned post
- Read mentions, bookmark folders, private 30-day analytics, and the users/posts behind likes, reposts, and quotes
- Like, unlike, repost, undo a repost, bookmark, remove a bookmark, hide a reply, or unhide it
- Send a confirmed 1:1 or group DM to explicit numeric user IDs

Most read tools return at most one page per call and expose continuation tokens instead of fetching more automatically. Personal-history search, personal connection search, and follow verification are exceptions: they paginate internally within explicit limits. Personal-history search fetches up to 100 authored posts per page and searches through X's available user timeline, excluding reposts. X exposes at most the 3,200 most recent posts through that timeline, so this is not guaranteed to cover accounts with more history. Personal connection search inspects up to 10,000 following profiles and searches up to 10,000 followers only when following has no match. Every AI write uses Raycast's native confirmation UI, with destructive styling for post deletion. Engagement and moderation tools operate on one explicitly identified post and are not intended for bulk, scheduled, or autonomous interaction.

For example, ask `@twitter Does @participant follow @raycast?` or `@twitter List @participant's followers.` The `get-user-connections` tool returns up to 20 profiles per page from the requested account. The `check-follow-relationship` tool resolves both exact handles and scans the source account's following, matching by user ID. It stops on a match, a complete list, or the page budget (default 10 pages of up to 1,000 users; set `maxPages` from 1 to 10 to lower the budget). Profile lookups and uncached pages consume API reads; successful reads use the same two-minute cache. Only a complete, error-free scan without a match produces `not_following`. Access errors, partial responses, repeated pagination tokens, and exhausted page budgets produce `unverified`, with a reason and scan counts. In CSV output, these remain `unverified`, never `no`. This is a read-only check and cannot bypass protected-account restrictions. These two new capabilities are available through Raycast AI; the Search User command still searches your own connections.

## X API access

All in-extension network operations use the official X API v2 through OAuth user context. Because X API v2 does not offer a general user-search endpoint, **Search User** combines exact username lookup with local matching across the authenticated user's following and followers. Endpoint availability and billing depend on X's current developer platform and the access attached to the extension's X application. If X rejects a request, the extension displays the error details returned by the API; rate-limited requests wait for the documented reset only when the delay is short enough to be useful.

OAuth tokens are handled by Raycast's OAuth client. The first launch after this update asks you to authorize the new media, bookmark-write, reply-moderation, and DM scopes. Post and thread drafts store text and local media paths in Raycast LocalStorage on the device; media bytes are sent to X only when you publish.
