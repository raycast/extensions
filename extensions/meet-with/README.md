# Meet With

Search a Google Workspace coworker by name and see their week at a glance —
day-grouped (Today, Tomorrow, …) like Raycast's My Schedule, with a graphical
day timeline — without opening Google Calendar.

- Type ≥2 characters → live directory search.
- Pick anyone → their schedule for the next 7 days.
- **Graphical day view**: proportional event blocks with side-by-side overlaps,
  an all-day strip, and a red "now" line, rendered right in the detail pane.
  Toggle it off for a plain list (⌘K → Hide Calendar).
- Shared calendar → real event titles and times. Not shared → "Busy" blocks via
  free/busy, with a banner saying so.
- **Google Meet**: rows with a meeting link show a 🎥 icon; press Enter to join.
- Attendee counts on each event, favorites, and last-viewed suggestions.
- One accent color for all blocks — defaults to your macOS system accent, or pick
  a fixed color in preferences.

## Setup

The extension needs a Google OAuth client that you own. Raycast does not provide a
shared Google client, and a Workspace-internal client skips Google's app
verification entirely. One-time, about ten minutes:

1. Open [console.cloud.google.com](https://console.cloud.google.com) and create a
   project (or pick an existing one).
2. **APIs & Services → Library**: enable **Google Calendar API** and **Google
   People API**.
3. **Google Auth Platform → Branding**: create the consent screen. Name it
   `Raycast (Meet with)`. Under **Audience** choose **Internal** if your account is
   on Google Workspace (recommended, no verification needed). If you must choose
   **External**, add yourself under **Test users**.
4. **Google Auth Platform → Clients → Create client**: type **iOS**, bundle ID
   `com.raycast`. Copy the client ID.
5. Run **Meet with** in Raycast, paste the client ID into the **Google OAuth Client
   ID** preference, and approve the Google sign-in. It lists the two read-only
   scopes: `calendar.readonly` and `directory.readonly`.

Token refresh is automatic; you will not be asked to sign in again on reopen.

## Preferences

- **Google OAuth Client ID** — from the setup above.
- **Event Color** — `System Accent` (reads your macOS accent), a fixed Apple color, or `Custom`.
- **Custom Color** — hex like `#FF6B00`, used when Event Color is `Custom`.

## Troubleshooting

- **Directory search returns nothing for everyone** → your Workspace admin has
  directory sharing locked down (`searchDirectoryPeople` denied). Nothing the code
  can fix.
- **`SERVICE_DISABLED` / 403 on a schedule** → the Calendar API isn't enabled on
  the project. Re-do setup step 2; wait ~1 min to propagate.
- **"Access blocked: app has not completed verification"** → the consent screen is
  External and you are not listed as a test user. Add yourself under Test users, or
  switch the audience to Internal.

## Development

```sh
npm install
npm run dev      # ray develop — registers "Meet With" into Raycast
npm run lint
```

```
src/
├── meet-with.tsx   command: person picker (search + suggestions + favorites)
├── schedule.tsx    pushed view: week grouped by day + graphical day timeline
├── favorites.ts    LocalStorage favorites + last-used, keyed by email
└── google.ts       OAuth service, directory search, schedule + free/busy fallback
```

The day-timeline is drawn as an SVG and embedded as a data-URI image in the
Markdown detail pane. `icon-source.html` is the editable icon source
(render with headless Chrome to `assets/extension-icon.png`).
