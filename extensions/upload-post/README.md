# Upload-Post

Publish and schedule videos, photos and text posts to TikTok, Instagram, YouTube, LinkedIn, Facebook, X, Threads, Pinterest, Bluesky and more from Raycast, using [Upload-Post](https://www.upload-post.com).

## Setup

1. Create an account at [upload-post.com](https://www.upload-post.com) and connect your social accounts to a profile in [Manage Profiles](https://app.upload-post.com/manage-users).
2. Create an API key at [app.upload-post.com/api-keys](https://app.upload-post.com/api-keys).
3. Paste the key in the extension preferences the first time you open a command.

## Commands

- **Create Post** – pick a profile, the platforms connected to it, and a text, photo or video post (from a local file or a URL). Publish now, pick a date, or add it to the profile's queue. The confirmation toast shows the `request_id` and opens the upload status.
- **Scheduled Posts** – browse scheduled and queued posts, check their status or cancel them.
- **Upload History** – recent uploads with their result and a link to each published post.
- **Profiles** – your profiles and the accounts connected to each one, with a warning when an account has to be reconnected.

## AI Extension

Mention `@upload-post` in Raycast AI to publish, schedule, list, check or cancel posts in plain language, for example:

- `@upload-post post "We just shipped dark mode" on X and LinkedIn`
- `@upload-post schedule ~/Movies/demo.mp4 on TikTok and Instagram tomorrow at 9am with the caption "New feature"`
- `@upload-post what do I have scheduled this week?`
- `@upload-post which uploads failed today?`

Publishing and cancelling always ask for confirmation first.
