# wip.et — Ship It

Post done's and todos to your [wip.et](https://wip.et) feed from Raycast. Stay
in flow — no tab-switch, no form to fill out.

## What you can do

- **Compose with autocomplete.** Type `#` to pick or create a project on the fly. Up to 8 matches surface as you type.
- **Ship or queue.** `⌘↩` posts as **Done**, `⌘⇧↩` posts as **Todo**.
- **Attach images.** `⌘I` opens a file picker; up to 3 images per post (JPEG, PNG, WebP, GIF — max 10 MB each).
- **Confirmation toast.** See exactly which projects and how many images landed.

## Getting set up

1. Sign in at [wip.et](https://wip.et) with GitHub or Google. Pick a username.
2. Open [wip.et/settings/api-keys](https://wip.et/settings/api-keys), select **raycast**, click **Create key**. Copy the value — it's only shown once.
3. In Raycast, open the **wip.et** extension's preferences:
   - **API URL** — leave at `https://s.wip.et` unless you self-host.
   - **API Key** — paste the key from step 2.
4. Run **Ship It** (search "ship it" in Raycast). Type something, pick a `#project`, hit `⌘↩`.

## Tips

- The search bar **is** the textarea. Just start typing — no separate compose field.
- `#` triggers the picker at the trailing token. The picker hides as soon as the token completes or you space past it.
- If you type a `#newslug` that doesn't exist yet, a "Create #newslug" option appears at the bottom of the matches.
- Attached files show up as a section above the post action. Each has a Remove action.

## Privacy

Everything you post goes straight to your wip.et feed under your account. The extension stores the API URL + key in Raycast preferences only — no telemetry, no third-party calls beyond the wip.et API and Cloudflare R2 for image uploads.

## Built with

- TypeScript + React on top of [`@raycast/api`](https://developers.raycast.com).
- Talks to the wip.et HTTP API; presigned PUT to Cloudflare R2 for uploads.

## Issues / feedback

Open one at [github.com/RobiMez/wipet](https://github.com/RobiMez/wipet) or message `@robi` on wip.et.
