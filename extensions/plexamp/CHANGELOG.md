## [Plex Sign-In, Now Playing, and Search Improvements] - {PR_MERGE_DATE}

- Added managed Plex sign-in, server selection, and music library selection inside Raycast.
- Added the `Plexamp Status` command for inspecting the active Plexamp client and selected music library.
- Renamed `Player Controls` to `Now Playing`.
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
- Reworked the library search flow.
- Improved browse and search result presentation.
- Updated package and type configuration to match the revised search implementation.

## 2026-02-28

- Initial release of the Plexamp Raycast extension.
- Added library browsing for artists, albums, tracks, and playlists.
- Added mixed Plex server and Plexamp control support, including play, queue, play next, and transport controls.
- Added dedicated player controls with queue inspection and jump-to-track actions.
- Added library selection preferences and automatic music library resolution.
- Added search commands for artists, albums, and tracks.
- Added shared playback UI, XML parsing, formatting helpers, and Raycast command wiring.
