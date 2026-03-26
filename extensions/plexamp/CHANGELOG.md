# Plexamp CHANGELOG

## [Recently Played] - 2026-03-26

- Added the `Recently Played` command to browse the 50 most recently played tracks from the selected Plex music library.
- Recently played data is cached for instant startup on repeat opens.

## [Instant Library Startup Cache] - 2026-03-26

- Added stale-while-revalidate caching for the Browse Library artist and playlist lists using Raycast's Cache API, so repeat opens show content instantly while refreshing in the background.
- Cached data is preserved on reload and on transient server errors instead of resetting to an empty list.

## [Album Grid View] - 2026-03-26

- Added a toggleable Grid view for artist album pages showing album art in a square grid with release year subtitles.
- Added release type grouping in Grid view: albums are organized into sections (Albums, EPs, Singles, Compilations, Live, Demos, Remixes) sorted by release year descending.
- Added Grid/List toggle action (`Cmd+Shift+V`) with the preference persisted across sessions.
- Added the `Album View Grid Columns` extension preference to configure grid columns (3-6, default 4).

## [Large Library Performance Fixes] - 2026-03-25

- Fixed "JS heap out of memory" crashes when browsing large music libraries by paginating all Plex API requests so no single XML response can exceed the Raycast worker memory limit.
- Fixed playlist section resolution causing excessive memory usage by removing the N+1 metadata lookup per playlist and filtering by the explicit library section key instead.
- Added paginated API fetching for artists, albums, tracks, and playlists so each request loads a bounded page of results.
- Added smart track loading for playlists and albums: lists with 1,000 or fewer tracks load fully for scoped client-side filtering; larger lists paginate and fall back to library-wide server-side search.
- Added server-side search fallback for large playlist track lists using the Plex `/hubs/search` endpoint.
- Added play queue windowing so the Now Playing view loads at most 200 tracks around the current position instead of the entire queue.
- Added `@raycast/utils` dependency for `usePromise` pagination support.

## [Server Connection Fixes] - 2026-03-25

- Fixed "All promises were rejected" error on Browse Library, Search Library, and Status commands by saving the verified working connection URL from library selection instead of an untested preferred URL.
- Fixed the Now Playing Menubar not showing track information by using the server address from Plexamp's timeline response instead of the saved server URL.

## [Library Selection Fixes] - 2026-03-24

- Fixed music library detection failing silently when the preferred server connection is unreachable by trying all connections concurrently.
- Fixed the library selection screen hanging for minutes when remote server connections timeout.
- Fixed the "Sign in to Plex" screen flashing briefly on the Plexamp Status command while the initial load completes.
- Added progressive loading to the library selection screen so libraries appear as each server responds instead of waiting for all servers.
- Added local server prioritization so nearby servers appear first during library selection.
- Removed servers without music libraries from the library selection screen.
- Removed the LAN badge and "Shared By" accessories from library selection items.

## [Plex Sign-In, Now Playing, and Search Improvements] - 2026-03-22

- Added managed Plex sign-in, server selection, and music library selection inside Raycast.
- Added the `Plexamp Status` command for inspecting the active Plexamp client and selected music library.
- Renamed `Player Controls` to `Now Playing`.
- Added the `Now Playing Menubar` command to show current album art and playback text in the macOS menu bar.
- Added the `Menubar Format` preference with `{track}`, `{album}`, and `{artist}` placeholders for customizing menu bar text.
- Added `Go to Album` and `Go to Artist` actions for tracks on the `Now Playing` screen.
- Added `Clear Queue` to `Now Playing`, preserving the current track while removing the rest of the queue.
- Added `Select Library` and `Sign Out from Plex` actions to `Plexamp Status`.
- Added configurable track rating display with `5 Stars`, `5 Stars (Half Stars)`, and `1 Star` modes.
- Added track ratings inline after track titles in browse, search, and now playing views.
- Added zero-padded track number prefixes to now playing track rows.
- Added direct `Search Library` and `Browse Library` actions to `Now Playing`.
- Changed setup to keep `Plexamp URL Override` as the only remaining manual extension setting.
- Changed browse and search to work without a live Plexamp connection, showing Plexamp errors only when playback actions are used.
- Changed playlist browsing to filter audio playlists to the selected Plex music library.
- Added artist release grouping based on Plex album metadata, including support for `EP`, `Single`, `Live`, `Compilation`, `Soundtrack`, `Remix`, and `Demo` style groupings when Plex exposes them.
- Added colored album badges for year, track count, and album length in browse and search views.
- Added metadata-aware hydration for artist and search album results so Plex `Format` and `Subformat` tags can drive grouping accurately.
- Added request timeouts and batched album hydration to avoid a single stalled Plex request blocking large artist pages.
- Added track title prefixes so track numbers appear inline before the song title in browse and search lists.
- Renamed the Raycast commands to `Browse Library` and `Search Library`.
- Consolidated search into a single mixed library search that groups results into artists, albums, and songs.
- Reordered search results so artist matches appear above album and song matches.
- Changed `Play Next` to use `cmd+n`.
- Removed the explicit `Add to Queue` shortcut so Raycast can use its built-in secondary action shortcut behavior.
- Restored Raycast primary and secondary action ordering for `Now Playing` and track playback menus.
- Updated the `Search Library` empty state copy to `Search by Artist, Album or Track`.
- Updated artist browsing to query the library by `artist.id` instead of relying on the artist children view, so the full release set can be loaded.
- Sorted artist release groups by release year descending within each section.
- Fixed Raycast reserved shortcut conflicts for queue actions.
- Fixed release grouping precedence by preferring Plex `Subformat` over `Format`, which correctly classifies releases such as live albums and compilations.
- Fixed release misclassification by reading nested Plex `Format` metadata from full album payloads.
- Fixed artist pages hanging indefinitely when one album metadata request stalls.
- Fixed album duration rendering so it only appears when Plex provides album duration metadata directly.
- Fixed blank optional overrides preventing the saved music library selection from being reused.
- Fixed stale Plexamp URL caching so updated override values are used after relaunching a command.
- Fixed artist navigation from `Now Playing` tracks by normalizing Plex library section keys.
- Fixed menu bar refresh behavior by switching the `Now Playing Menubar` command to Raycast's 10 second background interval.
- Reworked the library search flow.
- Improved browse and search result presentation.
- Updated package and type configuration to match the revised search implementation.

## [Initial Release] - 2026-02-28

- Initial release of the Plexamp Raycast extension.
- Added library browsing for artists, albums, tracks, and playlists.
- Added mixed Plex server and Plexamp control support, including play, queue, play next, and transport controls.
- Added dedicated player controls with queue inspection and jump-to-track actions.
- Added library selection preferences and automatic music library resolution.
- Added search commands for artists, albums, and tracks.
- Added shared playback UI, XML parsing, formatting helpers, and Raycast command wiring.
