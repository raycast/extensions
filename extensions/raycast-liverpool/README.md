# Liverpool FC for Raycast

Keep track of Liverpool FC directly from the Raycast launcher.

## Features

- **Next fixture** with opponent, competition, kickoff time in your chosen timezone, and crest artwork.
- **Upcoming fixtures list** with competition/home-away filters plus relative labels like Today, Tonight, and Tomorrow.
- **Last result** showing score, competition, and outcome tags.
- **Premier League and Champions League standings** rendered as interactive lists with badges and quick stats.

## Data Sources

- Primary: [football-data.org](https://www.football-data.org/) (free API key required for higher quota and latest details).
- Secondary: [TheSportsDB](https://www.thesportsdb.com/) (public demo key `123` used automatically when no key is provided).
- Requests are cached for 5 minutes to avoid hitting rate limits.

## Getting Started

1. Install dependencies: `npm install`.
2. In Raycast, open **Extensions → Import Extension**, and select this directory.
3. Open the command preferences:
   - `football-data.org API Key` (optional but recommended for reliability).
   - `TheSportsDB API Key` (optional; defaults to `123`).
   - `Display Timezone` to override the default Manila display timezone.
4. Invoke the command by typing `Liverpool FC` in Raycast.

## Development

- Run `npm run dev` for Raycast’s live develop mode.
- Run `npm run build` to verify the production bundle.

## Publishing

- Ensure metadata in `package.json` is correct, then run `npm run publish` to submit the extension to the Raycast Store.

## Notes

- Liverpool FC identifiers: football-data.org team **64**, TheSportsDB team **133602**.
- Timezone formatting relies on `Intl.DateTimeFormat` and supports any IANA timezone string.
- Source code lives in `src/liverpool.tsx`.
