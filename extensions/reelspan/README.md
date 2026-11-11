# Reelspan for Raycast

Publish to TikTok, YouTube, Instagram, Facebook, X, Threads, LinkedIn, Pinterest, Bluesky, Reddit and more
from Raycast with [Reelspan](https://reelspan.com), and ask Raycast AI to do it for you.

## Setup

You need a [Reelspan](https://reelspan.com) account with at least one profile and a connected social account.

1. Create an API key at [app.reelspan.com/dashboard/api-keys](https://app.reelspan.com/dashboard/api-keys).
2. Open any Reelspan command and paste the key when Raycast asks for it.
3. Optionally set a **Default Profile** (the profile username, e.g. `acme`) to preselect it when posting.

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

Posting and canceling always ask for confirmation first.
