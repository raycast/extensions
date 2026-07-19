# Status Nerd

A native **Raycast extension** that sets a funny work status on **Slack, GitLab and GitHub** at once — pick which services to update, roll a random status, or generate one from your own notes with Raycast AI.

https://github.com/user-attachments/assets/b4afaf99-b64e-446f-bb0e-0408673d68e8



## Features

- Set the same status on **Slack, GitLab and GitHub** in one go
- **Choose services per run** (or set your defaults in preferences)
- **Notes → AI**: type a few keywords, get status suggestions from Raycast AI, shuffle through them, then set
- **Meeting Status**: generate a status from your current/next calendar meeting (privacy-guarded — hints at the *kind* of meeting, never the details)
- **Select Status**: pick from your recent, saved and default statuses; save your own
- **Random Status**: one command, one click, a random status on your default services
- **Clear Status**: remove your status everywhere at once
- **Your own tone**: a short onboarding captures how your AI statuses should sound (change anytime with ⌘T)
- **Configurable duration**: default in preferences, override per run (until 17:30, 1h/4h/8h, end of day, never)
- Tokens stored **encrypted** by Raycast (no `.env`); any service left without a token is skipped
- Per-service failures are isolated — GitLab being down never blocks Slack

## Install from source

To run the latest version from source:

```bash
git clone https://github.com/jnwrnr/status-nerd.git
cd status-nerd
npm install
npm run dev
```

`npm run dev` imports the extension into Raycast (the commands appear immediately, with hot-reload). Once you run:

```bash
npm run build
```

the extension stays installed permanently — no terminal or `npm run dev` needed to use it.

## Configure tokens

Open the extension's preferences in Raycast and add the tokens for the services you want (all optional):

- **Slack User Token** — `xoxp-` token with the `users.profile:write` scope. Create at [api.slack.com/apps](https://api.slack.com/apps) → OAuth & Permissions.
- **GitLab Token** — personal access token with the `api` scope. Create at [GitLab → Access Tokens](https://gitlab.com/-/user_settings/personal_access_tokens).
- **GitHub Token** — classic PAT with the `user` scope (needed for `changeUserStatus`). Create at [github.com/settings/tokens](https://github.com/settings/tokens). Fine-grained tokens don't reliably support status changes — use a classic token.

Then pick your **Default Services** in preferences — these are preselected in *Set Status* and used by *Random Status*.

### Optional: calendar (for Meeting Status)
Add a **Calendar ICS URL** in preferences to enable *Meeting Status*:

1. Open [Google Calendar](https://calendar.google.com) in a browser → ⚙️ **Settings**
2. Under **Settings for my calendars**, click the calendar you want
3. Scroll to **Integrate calendar**
4. Copy **Secret address in iCal format** — *not* "Calendar ID" and *not* "Public address"
5. Paste it into the extension's **Calendar ICS URL** preference

The correct URL starts with `https://calendar.google.com/calendar/ical/`, contains `/private-…`, and **ends in `/basic.ics`**. A `404` almost always means the "Public address" was used on a non-public calendar, or part of the URL is missing.

It grants read access to that calendar, so treat it like a secret — it's stored as a password preference. See Google's guide: [Sync your calendar with computer programs](https://support.google.com/calendar/answer/37648).

## Usage

### Set Status
1. Run **Set Status** — on first launch, a short onboarding asks for your **tone** (how AI statuses should sound, e.g. "dry sarcasm, never corporate"). Change it anytime with **⌘T**.
2. Type a few keywords in **Notes** (e.g. "sprint planning, too many meetings, coffee")
3. Press **Enter** → Raycast AI turns them into several suggestions, in your tone
4. **⌘R** to shuffle through them · **⌘G** to generate a fresh batch
5. **Enter** to set the status on the selected services

Emoji and text stay editable, so you can tweak any suggestion before setting it. The **Duration** dropdown overrides your default duration for this run.

<img width="608" height="342" alt="status on gitlab" src="https://github.com/user-attachments/assets/688efc6b-f4c4-4946-8dd2-681d7b3bc31f" />

### Meeting Status
Run **Meeting Status** — it reads your current meeting (or the next one within 24h) from the calendar ICS feed and generates status suggestions from the meeting's title + agenda, in your tone. **⌘R** to shuffle, **⌘G** to regenerate, **Enter** to set. All-day and cancelled events are skipped.

Privacy: the prompt is instructed to never include names, companies, or confidential details — statuses only hint at the *kind* of meeting, so they're safe on a public profile. You review every status before it's set.

### Select Status
Run **Select Status** for a searchable list in three sections:
- **Recent** — the statuses you set most recently (tracked automatically)
- **Saved** — your own statuses
- **Defaults** — the built-in list

Enter sets the selected status on your default services. Other actions: **Save to Saved** (⌘S), **Remove** (⌘⌫ for saved/recent), and **Create New Status…** (⌘N) to add your own.

### Random Status
Run **Random Status** for a one-click random status on your default services (no form).

### Clear Status
Run **Clear Status** to remove your status on all configured services at once (one click, no form).

## Notes

- **AI generation requires Raycast Pro.** Without it, ⌘R falls back to a built-in list of 30+ statuses.
- **Expiration:** set the default in preferences (until 17:30, 1h, 4h, 8h, end of day, don't expire) and override it per run in Set Status. Slack and GitHub honor the exact time; GitLab only supports fixed buckets (30 min, 3h, 8h, 1/3/7/30 days), so it snaps to the nearest one.
- Emoji format: Slack-style `:shortcode:`. GitLab drops the colons, GitHub keeps them — the extension handles the conversion, and only emoji valid on all three services are used.

## Customizing the statuses

The built-in list (used by **Random Status** and by the ⌘R shuffle fallback when AI isn't available) lives in [`src/lib/statuses.ts`](./src/lib/statuses.ts). Add or edit entries in the `STATUSES` array:

```ts
{ emoji: ":fire:", text: "Putting out fires since 9am", gitlab_emoji: "🔥" },
```

- `emoji` — Slack-style shortcode. Use a **standard** emoji that exists on Slack (e.g. `:rocket:`), otherwise Slack falls back to a generic icon.
- `text` — the status message.
- `gitlab_emoji` — the actual emoji character, shown in the Raycast confirmation.

The AI suggestions (⌘G) don't use this list — they're generated from your notes and restricted to a curated set of safe emoji in [`src/lib/emoji.ts`](./src/lib/emoji.ts).

After editing, run `npm run dev` (hot-reload) or `npm run build` to pick up the change.

## License

MIT
