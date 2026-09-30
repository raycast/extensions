# Postproxy for Raycast

Publish posts, check your profiles, manage comments, and answer direct messages across all your
social platforms — Facebook, Instagram, TikTok, LinkedIn, YouTube, X/Twitter, Threads, Pinterest,
Bluesky, Telegram, and Google Business — straight from Raycast, powered by the
[Postproxy](https://postproxy.dev) API.

## Setup

1. Create a Postproxy API key at **[app.postproxy.dev](https://app.postproxy.dev)** → **Settings → API**.
2. Open any Postproxy command in Raycast. On first run you'll be asked for your **API Key** — paste it
   in. It's stored securely in the macOS Keychain and never leaves your machine except as a request to
   the Postproxy API.

## Commands

- **Status** — one-glance activity snapshot for the last 24 hours / 7 / 30 days: posts published and
  failed, engagement, comments/DMs/reviews received, and what's awaiting your reply (with deltas vs
  the previous window).
- **Profiles** — browse your connected profiles grouped by profile group; filter by group, view a
  profile's posts, toggle stats, and (for Google Business) read and reply to reviews.
- **Publish Post** — compose a post, pick one or more target profiles, attach media, schedule it for
  later, or save it as a draft. Choose placements (Facebook Page, LinkedIn Organization, Pinterest
  Board, Telegram Channel) and pass raw per-platform parameters as JSON.
- **Recent Posts** — review recent posts filtered by date, platform, or status; drill into per-platform
  results and open a post's comments to reply, hide, like, or delete them.
- **Recent Comments** — browse recent comments across a profile's posts in one feed and reply inline.
- **Direct Messages** — pick a profile, browse conversations, read the thread, reply, and react to
  messages.

## Notes

- Comments and DMs are scoped to a specific connected profile. When a post was published to multiple
  profiles on the same platform, the extension lets you choose which profile's comments to view.
- Stats for Facebook, LinkedIn, and Telegram require a connected placement (page / organization /
  channel); the Profiles detail panel handles this automatically.

## Development

```bash
npm install
npm run dev     # imports the extension into Raycast with hot reload
npm run lint    # lint + format check
```

Requires the Raycast app running and a signed-in Raycast account. Node 22 LTS is recommended for the
`ray` CLI.
