<p align="center" style="display:flex">
	<img width="50" src="./assets/icon.png">
</p>

# Music

> Apple music extension

![sc1](./assets/screnshot-1.png)
![sc2](./assets/screnshot-2.png)

## Catalog playback

**Search Apple Music** offers **Play in Music** for catalog songs, including songs
not in your library. **Just Play** still searches the library first; when there
are no results it signs in to Apple Music and plays the first playable catalog
result. Use Search Apple Music to choose a specific edition or recording.

AI can use **Search Apple Music Catalog**, then **Play Catalog Song** with a
returned song ID. Playback never adds the song to your library.

Catalog playback requires an Apple Music subscription, Music signed in, and
Raycast's **Accessibility** and **Automation** permissions in System Settings.
It brings Music to the foreground, selects the matching row in the album table,
and presses Return. Avoid switching apps while it starts. It verifies the
playing title, artist and album before reporting success.

This uses Music's accessible album-table layout, not a public catalog playback
API. Unsupported layouts, ambiguous rows, missing metadata, /song/ links, or
permissions fail with an error; **Open in Music** remains available.
Albums and playlists retain their existing behavior.

## Troubleshooting

- Enable **Start Playlist** in Raycast Settings → Extensions → Music. It is disabled by default.
- **Add to Playlist** favorites the current track when you choose Music's smart Favorite Songs or Favourite Songs playlist. **Favorite Track** does the same directly.
- Music may not expose a station's current track to AppleScript. If Add to Playlist cannot access it, add the song in Music first.
- If **Add to Library** creates an entry with an incorrect date or does not sync it to your cloud library, use **Search Apple Music** and its **Add to Library** action. That command uses the Apple Music API and requires sign-in. The current-track shortcut still uses Music's AppleScript duplication command.
- If Music stops responding after sleep, reopen Music and retry. Script timeouts prevent indefinite waits but cannot repair Music's internal state.

## Development

Run `npm test`, `npx tsc --noEmit`, `npm run build`, and `npm run lint`.
The regression suite covers subprocess handling, search ranking, metadata parsing, and generated scripts. Playback, cloud sync, and station behavior also need testing in Raycast with Music on macOS.
