# Reelspan for Raycast

Publish to TikTok, YouTube, Instagram, Facebook, X, Threads, LinkedIn, Pinterest, Bluesky, Reddit and more
from Raycast with [Reelspan](https://reelspan.com), and ask Raycast AI to do it for you.

## Commands

| Command | |
|---|---|
| **Create Post** | Text, a video or photos (from files or URLs), now, scheduled or queued, with a first comment. Only the networks the profile has connected are offered; you see each network's result and link. |
| **Post History** | Recent posts with each network's result. Open, copy the link, or retry a failed network. |
| **Scheduled Posts** | What is waiting, and cancel with a confirmation. |
| **Profiles** | Connected networks per profile; copy a connect link for a client. |

## Raycast AI

Mention `@reelspan` in Raycast AI:

- *@reelspan post "Dark mode is live 🌙" to X, Threads and Bluesky for acme*
- *@reelspan schedule ~/Movies/launch.mp4 to TikTok and YouTube tomorrow at 9am*
- *@reelspan what failed in my last posts?*
- *@reelspan cancel the post scheduled for Friday*

Posting and cancelling always ask for confirmation first.

## Setup

1. Create an API key in the Reelspan dashboard (**API keys**).
2. Paste it into the extension preferences. Optionally set a default profile.

## Develop

```bash
npm ci
npm run dev     # ray develop
npm test        # shared logic, no network
npm run lint
```

MIT licensed. Security reports: see [SECURITY.md](SECURITY.md).
