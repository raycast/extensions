<p align="center">
  <img src="assets/icon.png" width="128" height="128" />
</p>

# Typefully

Create and manage social media drafts with [Typefully](https://typefully.com), directly from Raycast.

## Setup

This extension requires a Typefully API key. Get yours at [typefully.com → Settings → API](https://typefully.com/?settings=api), then paste it in the extension preferences.

## Commands

| Command | Description |
| --- | --- |
| New Draft | Create a draft for X, LinkedIn, Threads, Bluesky, or Mastodon |
| View Drafts | Browse your unpublished drafts |
| View Scheduled | Browse your scheduled drafts |
| View Published | Browse your published drafts |
| Search Social Sets | Browse your social sets and set a default |

## AI Tools

This extension includes AI tools for Raycast AI Chat:

- **Create Draft** — Create a draft from content or a prompt
- **List Drafts** — List drafts by status
- **List Social Sets** — List available social sets
- **Schedule Draft** — Schedule an existing draft

## Tips

- Use `---` on its own line to split content into a thread
- Set a default social set via **Search Social Sets** to skip the picker when creating drafts
- Platform selections are remembered per social set

## Store Submission Checklist

Reference: [Prepare for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store) · [Publish](https://developers.raycast.com/basics/publish-an-extension)

- **Icon**: 512×512 PNG, must work in light and dark modes. Use [icon.ray.so](https://icon.ray.so) to generate.
- **Screenshots**: 2000×1250 PNG (16:10), 3–6 images. Use Raycast's Window Capture → "Save to Metadata".
- **Metadata**: `author` must match Raycast username, `license` must be `"MIT"`, use latest `@raycast/api`.
- **Naming**: Title Case for extension/command titles. Commands should be `"<Verb> <Noun>"` or `"<Noun>"`.
- **CHANGELOG.md**: Required. Use `## [Title] - {PR_MERGE_DATE}` format with change details.
- **README.md**: Required when extension needs setup (API keys, preferences, etc.).
- **Preferences**: Use the preferences API for config/credentials. Mark required ones `required: true`. No separate config commands.
- **Actions**: Title Case (`"Open in Browser"`), provide icons for all actions, use `…` for submenu actions.
- **Prohibited**: No external analytics, no custom localization, no Keychain Access, no bundled heavy binaries.
- **Build check**: Run `npm run build` and `npm run lint` before submitting.
- **Publish**: Run `npm run publish` — opens a PR to `raycast/extensions`. Raycast team reviews and merges.
