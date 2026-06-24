# AniMe Raycast Extension

Discover anime with AniList GraphQL directly from Raycast.

AniMe does not use platform-specific APIs, so it is intended to work across Raycast's available platforms.

<img width="1000" height="625" alt="raycast-anime-1" src="https://github.com/user-attachments/assets/af128b43-a1e1-4695-8298-4bbf2b30cc6f" />
<img width="1000" height="625" alt="raycast-anime-3" src="https://github.com/user-attachments/assets/b4450c5f-6411-41fe-a5a7-ceb4bf89a8fa" />
<img width="1000" height="625" alt="raycast-anime-4" src="https://github.com/user-attachments/assets/fc08c128-e57f-461a-9ccc-2e6a0d9a74da" />

https://github.com/user-attachments/assets/fdf11146-0949-4d5d-ac57-9b5a779e4508

## First Run

AniMe asks two quick questions on first use:

- Whether you use Crunchyroll.
- Whether you prefer Gallery or List view. Gallery is the default and recommended option.

If Crunchyroll is enabled, AniMe opens Crunchyroll first when AniList provides a matching streaming link. AniList remains the fallback.

## Commands

- **Search Anime**: Search anime by title, filter by streaming platform, and view details, cover art, airing status, episode counts, release date, next episode, studios, genres, score, and external links.
- **Current Season**: Browse anime currently airing in the local season and year, grouped by the weekday of their next episode, with streaming platform filters.
- **Today's Episodes**: See episodes airing today using AniList airing schedules and local day timestamps, with streaming platform filters.
- **Last 7 Days**: See episodes that aired during the last seven days, grouped by air date, with streaming platform filters.
- **Watchlist**: View, filter, and remove anime saved locally with Raycast LocalStorage.

Every anime item includes streaming actions when AniList provides external links, plus a feedback action addressed to `esteban@damascuss.io`.

## Time Zones

AniList airing schedules return Unix timestamps. AniMe displays them using the machine's local time zone.
