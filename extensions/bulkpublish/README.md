# BulkPublish for Raycast

Write, schedule and publish social media posts with [BulkPublish](https://www.bulkpublish.com) straight from Raycast. Post to X, Instagram, LinkedIn, Facebook, Threads, Bluesky, TikTok, YouTube, Pinterest, Mastodon, Google Business, Discord, Telegram, Tumblr and Snapchat at once, then keep an eye on your queue without opening a browser.

## Commands

| Command | What it does |
| --- | --- |
| **Create Post** | Write a post, pick channels, attach images or a video, and publish now, add it to your queue, schedule it for a set time, or save it as a draft. Shows a live character count for each network you picked and warns you before a channel would reject the post. |
| **Search Posts** | Browse and search your posts, filter by status (scheduled, published, drafts, failed, awaiting approval), see where each one went out and open the live post. Retry failed destinations, publish a draft, move a scheduled post back to drafts, or delete it. |
| **View Queue** | Everything scheduled, grouped by day, plus your next free queue slot. |
| **List Channels** | Your connected accounts, with the ones that need reconnecting at the top. Start a post on one channel or see its posts. |

## Setup

1. Sign in to BulkPublish at [app.bulkpublish.com](https://app.bulkpublish.com). New here? [Create an account](https://www.bulkpublish.com).
2. Open **Developer** ([app.bulkpublish.com/developer](https://app.bulkpublish.com/developer)) and create an API key. It starts with `bp_`.
3. Run any BulkPublish command in Raycast and paste the key when asked.

Your key is kept in Raycast's preferences for this extension and is only sent to `app.bulkpublish.com`. You can change or remove it any time from the extension preferences.

## Tips

- **Add to Queue** uses the posting times you set up in BulkPublish, so you don't have to pick a time.
- Networks that need media (TikTok and YouTube need a video; Instagram, Pinterest and Snapchat need an image or video) are skipped with a note when you post text only. Everything else still goes out.
- X and Mastodon count every link as 23 characters, and the counter does too.
- If your team uses approvals, posts that need sign-off show as **Awaiting Approval** in Search Posts.
- `⌘ ↵` toggles a detail pane with the full text, media and per-channel status in Search Posts and View Queue.

## Links

- Website: [www.bulkpublish.com](https://www.bulkpublish.com)
- API documentation: [www.bulkpublish.com/developers](https://www.bulkpublish.com/developers/)
- Support: [support@bulkpublish.com](mailto:support@bulkpublish.com)
