# TownSpot Raycast Extension

Arrow-key-first event discovery in Raycast with grounded results from TownSpot.

## Setup

1. Install dependencies

```bash
npm install
```

2. Start in development mode from the extension root

```bash
npm run dev
```

If your Raycast CLI binary is not on PATH, `npm run dev` uses the local `ray` CLI bundled in the extension dependency.

## API + Preferences

- API is hardcoded to production: `https://api.townspot.co/api`.
- The only command preference is `Locale` (`en-GB`, `es-ES`, `ca-ES`).

For local API testing, temporarily change `PROD_API_BASE_URL` in `src/ask.tsx`.

## Command

- **TownSpot** (`ask`)
  - First use requires setting a `Hometown` before event results load.
  - Opens with upcoming listings and defaults to `Today + Tomorrow`.
  - Type naturally in the search bar (`today`, `this weekend`, `kids and family`).
  - Use up/down arrows to browse event results.
  - Use the top `When` filter row to jump between Now, All Upcoming, Today, Today + Tomorrow, Next 3/7 Days, and This Week.
  - Use the top `Category` filter row to quickly toggle categories (including kids/family).
  - Set or change your Hometown from the dropdown selector (visible active towns).
  - Run quick presets (Tonight, Weekend, Kids and Family, Free, Live Music).
  - Events are grouped by day sections (Today, Tomorrow, etc.) with time shown on the right.
  - Press Enter to open a native Raycast event detail page with full event metadata (description, venue/address, categories, pricing).
  - Event detail includes map actions (Apple Maps / Google Maps) when event coordinates are available.
  - Hometown is saved locally after selection and reused on next launch.

- **Ask TownSpot AI** (`ask-townspot-ai`)
  - Uses Raycast AI to generate a natural-language answer.
  - Grounded by verified listings fetched from TownSpot API (no invented events by design).
  - Reads your saved Hometown and queries that town context first.
  - Returns an AI summary plus a verified listings block with direct links.
  - Launch with an argument, for example: `kids events this weekend`.

## Endpoint Contract

POST to `/api/raycast/query` with:

```json
{
  "query": "what's on this weekend in kentish-town",
  "townSlug": "kentish-town",
  "locale": "en-GB",
  "limit": 8,
  "conversation": []
}
```

Response:

```json
{
  "answer": "I found 3 events in Kentish Town this weekend.",
  "events": [
    {
      "id": "...",
      "title": "...",
      "startTime": "...",
      "endTime": "...",
      "venueName": "...",
      "startLabel": "Mon 12 MAR · 20:00",
      "tags": ["Music"],
      "url": "https://townspot.co/event/..."
    }
  ],
  "town": { "name": "Kentish Town", "slug": "kentish-town", "timezone": "Europe/London" },
  "suggestions": ["..."]
}
```

## UX Behavior

- Results list is verified-events-first.
- Summary shown in the command is generated from returned events, not free-form AI text.
- Follow-up prompts can be selected with arrow keys and Enter to re-run quickly.
