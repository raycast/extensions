# Now Playing UI Contract

## Design direction

Use Raycast's native list-detail pattern so the command behaves like a compact controller, not a full music-player window. The left pane is the stable action hierarchy; the right pane is the selected track's artwork and metadata.

## Layout

- Render the command as `List` with `isShowingDetail`.
- Keep the current track, playback controls, browser entry point, discovery, metadata, and tools as curated list rows and sections.
- Keep one current-track row. Its primary action opens a compact Track Actions submenu containing the complete current-track operation set.
- Show the same now-playing detail for every row so navigation never hides the artwork or track context.
- Do not enumerate playlists or Swinsian windows in the root view. Those belong behind the relevant Library and Options actions.

## Visual system

- Use Raycast semantic icons and native selection, spacing, typography, and colors.
- Use the album artwork as the primary image in `List.Item.Detail` Markdown, capped at 185 × 185 so it remains prominent and fully visible.
- Keep core metadata first, then expose the complete available track, technical, catalog, notes, and file metadata in the native scrollable metadata pane.
- Prefer short row titles and subtitles; action panels contain the complete operation set.
- In artist browsing, use genre as the secondary label and album count as the accessory.

## Interaction

- Return on the Now Playing track opens `Track Actions`, containing `Add to Playlist`, `Add to Queue`, `Rating`, `Love on Last.fm`, `Reveal Track in Finder`, and the secondary Last.fm ban action.
- The root Playback row owns transport, seek, volume, queue, and playback-mode actions. Shuffle, repeat, stop-after-track, and reshuffle appear at the bottom of its submenu rather than in a separate root row.
- Playback mutations refresh current metadata after success.
- The Now Playing `Browser` row uses the current artist as its subtitle and opens that artist's albums as its primary action, with the current album and general library destinations available alongside it.
- Root action labels are concise: `Discovery`, `Metadata`, and `Tools`, without explanatory subtitles.
- Track action panels offer both immediate playback and non-disruptive addition to the end of Swinsian's playback queue.
- Menu-bar Playback is ordered `Transport`, `Track`, `Seek`, `Volume`, then `Modes`. The Track section owns Add to Playlist, Add to Queue, Rating, and Ban on Last.fm.
- Album rows expose `Add Album to Queue`, which appends every track from that artist/album selection in library order.
- Menu-bar Raycast destinations use the same command names as the extension: Browse Library, Quick Search, Browse Playlists, and Add Track to Playlist.
- `Quick Search` is the direct track lookup; `Browse Library` is the hierarchical artist, album, genre, and year navigator.
- Errors are surfaced through a HUD and never followed by a false success message.

## Accessibility

- Every icon has an adjacent text label.
- State is expressed in text as well as icons.
- The Now Playing section establishes current-track scope; avoid repeating the track title across separate action rows.
- Native Raycast keyboard navigation and action-panel semantics remain intact.

## Accepted debt

- Raycast controls split-pane width and artwork rendering; the extension does not use custom CSS.
- Artwork is cached as a disk file and may briefly lag while a new track's art is extracted.
