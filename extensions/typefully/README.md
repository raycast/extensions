<p align="center">
  <img src="assets/icon.png" width="128" height="128" />
</p>

# Typefully

Create and manage social media drafts with [Typefully](https://typefully.com), directly from Raycast.

## Setup

This extension requires a Typefully API key. Get yours at [typefully.com → Settings → API](https://typefully.com/?settings=api), then paste it in the extension preferences.

## Commands

| Command            | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| New Draft          | Create a draft for X, LinkedIn, Threads, Bluesky, or Mastodon |
| View Drafts        | Browse your unpublished drafts                                |
| View Scheduled     | Browse your scheduled drafts                                  |
| View Published     | Browse your published drafts                                  |
| Search Social Sets | Browse your social sets and set a default                     |

## AI Tools

This extension includes AI tools for Raycast AI Chat:

- **Create Draft** — Create a draft from content or a prompt
- **List Drafts** — List drafts by status
- **List Social Sets** — List available social sets
- **Schedule Draft** — Schedule an existing draft

## Tips

- Attach a copied image or screenshot with **Attach Image from Clipboard** in New Draft's Actions menu (**⌘⇧V** on macOS, **Ctrl+Shift+V** on Windows).
- Review or remove attachments in the **Images** field, or choose image files there. Up to 4 PNG, JPEG, WebP, or GIF images are supported. Images attach to the first post on each selected platform, and text is optional when images are attached.
- Images upload only when you submit the draft. Failed uploads keep the form content and attachments so you can retry.
- Use `---` on its own line to split content into a thread
- Set a default social set via **Search Social Sets** to skip the picker when creating drafts
- Platform selections are remembered per social set

## Local development

From `extensions/typefully`, run `npm ci`, then `npm run dev` to load the fork in Raycast. Enter your Typefully API key in the development extension's preferences.

Run `npm test`, `npm run build`, and `npm run lint` to check changes.
