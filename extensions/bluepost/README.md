# Bluepost

Cross-post from Bluesky to Mastodon. Bluesky is the source platform — write once, publish toot everywhere.

## Setup

### Bluesky

Your Bluesky credentials are configured in the extension preferences (prompted on first launch):

1. **Handle** — your Bluesky handle (e.g. `user.bsky.social`), with or without `@`
2. **App Password** — create one at [bsky.app](https://bsky.app/settings/app-passwords) → Settings → Privacy and Security → App Passwords

### Mastodon

Add one or more Mastodon accounts using the **Manage Mastodon Accounts** command:

1. **Instance** — your Mastodon instance domain (e.g. `mastodon.social`)
2. **Access Token** — generate one at your instance's Settings → Development → New Application. The app needs `read`, `write:statuses`, and `write:media` scopes.

## Commands

### Compose Post

Write a post and cross-post it to Bluesky and all selected Mastodon accounts.

- **300 character limit** (Bluesky's limit) with live counter
- **Optional link URL** — becomes a link card on Bluesky, appended as text on Mastodon
- **Optional attachments** — uploaded to all platforms
- **Account selection** — checkboxes to choose which Mastodon accounts receive the post
- Inline links and mentions are automatically detected via `RichText.detectFacets()`

Works without any Mastodon accounts configured — in that case, posts go to Bluesky only.

### Browse Posts

Browse your recent Bluesky posts and repost them to Mastodon.

- Lists your last 20 original posts (excludes reposts, replies, and @-directed posts)
- **Green tags** show which Mastodon accounts a post has already been reposted to
- **Blue `blog` tag** marks posts created by an automated pipeline (configurable URL prefix)
- Actions: Repost to All Mastodon, Repost to specific account, Open in Browser, Copy Text, Refresh

### Manage Mastodon Accounts

Add or remove Mastodon accounts. Credentials are validated on save.

## Preferences

| Preference | Required | Description |
|---|---|---|
| Bluesky Handle | Yes | Your Bluesky handle or DID |
| Bluesky App Password | Yes | App password from bsky.app |
| Automated Post URL Filter | No | URL prefix to tag automated posts (see below) |

### Automated Post URL Filter

If you have a blog or other tool that automatically posts to Bluesky, you can set a URL prefix (e.g. `https://example.com/blog/`) to identify those posts. Any post in **Browse Posts** that contains a link card or inline URL matching this prefix gets a blue `blog` tag, making it easy to spot which posts came from your pipeline versus ones you wrote manually.
