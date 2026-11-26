# ShortSync

Create, schedule and manage your [ShortSync](https://www.shortsync.app) social media posts from Raycast and your menu bar. Post to Instagram, TikTok, YouTube, LinkedIn, X, Threads, Bluesky, Facebook, Pinterest and the other platforms you've connected in ShortSync.

## Commands

- **Create Post**: write a caption, attach an image or video (optional), pick one or more connected accounts, then publish now or schedule it for a date and time.
- **Scheduled Posts**: your upcoming posts, soonest first, with the platform, account and time. Publish a post now, cancel it or copy its caption. Switch to **Failed** to see posts that failed in the last 30 days and retry or remove them.
- **Next Scheduled Post** (menu bar): shows when your next post goes out, the next few posts and how many posts failed. Refreshes every 10 minutes.

## Setup

1. Sign in to [ShortSync](https://www.shortsync.app) and open **Settings**, then **API, MCP & webhooks**.
2. Create a workspace API key. It starts with `ss_live_` and works for one workspace.
3. Paste the key into the extension's **API Key** preference when Raycast asks for it.

Each key belongs to one workspace. To post to a different workspace, create a key there and change the preference.

## Good to know

- Media files can be mp4, mov, webm, avi, mkv, jpg, png, webp, heic or gif. Videos can be up to 2 GB and images up to 20 MB.
- TikTok, YouTube, Instagram, Pinterest and Snapchat need an image or video. YouTube takes videos only.
- YouTube and Reddit posts need a title. If you leave the title empty, the first line of your caption is used. YouTube also uses the caption as the video description.
- Settings you haven't set here (for example YouTube visibility or TikTok privacy) come from your saved defaults in ShortSync.
- Your plan's daily posting limits and monthly API requests apply. See [the limits](https://www.shortsync.app/docs/platforms/limits).

## Privacy

The extension talks only to the ShortSync API with your key. Your key is stored in Raycast's encrypted preferences.
