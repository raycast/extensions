# YouTube Noti — Holo

A [Raycast](https://raycast.com) extension that shows **who’s live** from your own list of YouTubers. Type **Holo** in Raycast to see who’s streaming right now.

## Setup

1. **Install the extension** in Raycast (import this folder or use **Raycast → Extensions → Add extension**).
2. **Icon**: Add `extension-icon.png` (512×512) in the `assets` folder if you want a custom icon.
3. **Preferences** (Raycast → Extensions → YouTube Noti → Preferences):
   - **YouTube API Key** (required)  
     Create one at [Google Cloud Console](https://console.cloud.google.com/): **APIs & Services → Credentials → Create credentials → API key**. Then enable **YouTube Data API v3** for the project.
   - **Channel IDs** (optional if you use the file below)  
     One ID per line or comma-separated. You can paste full URLs too: `https://www.youtube.com/channel/UCxxxx` — the extension will use the ID.
   - **Channel IDs file** (optional, best for 20+ channels)  
     Pick a `.txt` file with **one channel ID per line**. If set, the Channel IDs box is ignored. Easy to edit in Notepad and add/remove channels.

## How to get channel IDs

- **From the channel URL**  
  If the URL looks like `youtube.com/channel/UCp-5t9SrOQwXMU7iIjQfAUg`, the part after `/channel/` is the ID (`UCp-5t9SrOQwXMU7iIjQfAUg`). Paste the full URL or just the ID; both work.

- **From the channel’s About page**  
  1. Open the channel.  
  2. Click **About**.  
  3. Click **Share channel** — the link includes the channel ID. Or scroll down: some pages show “Channel ID” in the stats.

- **If the URL uses @handle** (e.g. `youtube.com/@MrBeast`)  
  The ID is not in the URL. Either:  
  - Open the channel, go to **About** → **Share channel** and copy the link (it will contain the ID), or  
  - Use a [Channel ID finder](https://ytpeek.com/tools/channel-id-finder) and paste the @handle or channel URL to get the ID.

- **Lots of channels (20+)**  
  Use **Channel IDs file** in preferences: create a `.txt` file, put one channel ID per line, save it, then in Raycast preferences choose that file. You can edit the file anytime to add or remove channels.

## YouTube API quota (10,000 units/day)

Google gives **10,000 quota units per day** per project (resets at midnight Pacific). The **Stream** command only fetches **who’s live right now** (no upcoming or ended), so each open/refresh uses the minimum:

- **Per open/refresh:** **(number of channels × 100) + 1** units  
  - One `search.list` per channel (100 units each) + one `videos.list` (1 unit) for stream details.

Example: **37 channels** → 3,701 units per open → you can open **~2–3 times per day** and stay under 10k. With **99 channels** → 9,901 per open → about **1 open per day**. If you need more, request an increase in [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → YouTube Data API v3 → Quota.

## Usage

- Type **Stream** (or **holo**, **live**, **youtube**) in Raycast.
- The list shows who from your channel list is **currently live**, with thumbnails and viewer counts.
- **Actions**: Open stream, Copy link, Open channel, Refresh.

## Development

```bash
npm install
npm run dev   # requires Raycast app
npm run build
```

## License

MIT
