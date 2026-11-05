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
returned song ID. AI playback leaves the conversation open rather than closing
Raycast and potentially reactivating Music. Playback never adds the song to your library.

Catalog playback requires an Apple Music subscription, Music signed in, and
Raycast's **Automation** permission to control Music. It does not require
Accessibility, select UI elements, simulate keys, or activate Music.

The extension obtains the ordered album tracklist from Apple's API, stops the
current queue, opens the album with macOS `open -g`, then uses native playback
and Next Track commands. This is not a direct play-by-catalog-ID API: preparation
can take several seconds, replaces the queue, and changes Music's background page.
Intermediate tracks are silenced, each step is verified by title, artist and album,
and the original volume and shuffle settings are restored. On failure, playback
is paused before restoring settings. A separate cleanup subprocess also runs after
a playback timeout; if Music is unresponsive, a restoration error is reported.

Concurrent catalog requests are rejected with a native macOS lock. Avoid changing
playback, volume or shuffle during preparation; switching applications is fine.
A native macOS notification is requested only after playback and restored settings
are verified. Its visibility depends on notification permissions and Focus settings.

Incomplete album tracklists, unavailable preceding tracks, indistinguishable
metadata, unsupported links or a preparation deadline fail safely with an error;
**Open in Music** remains available. Albums and playlists retain their existing
behavior. This route depends on Music's album-link behavior, not its UI layout,
and still needs real-device checks after macOS/Music updates.

## Troubleshooting

- Enable **Start Playlist** in Raycast Settings → Extensions → Music. It is disabled by default.
- **Add to Playlist** favorites the current track when you choose Music's smart Favorite Songs or Favourite Songs playlist. **Favorite Track** does the same directly.
- Music may not expose a station's current track to AppleScript. If Add to Playlist cannot access it, add the song in Music first.
- If **Add to Library** creates an entry with an incorrect date or does not sync it to your cloud library, use **Search Apple Music** and its **Add to Library** action. That command uses the Apple Music API and requires sign-in. The current-track shortcut still uses Music's AppleScript duplication command.
- If Music stops responding after sleep, reopen Music and retry. Script timeouts prevent indefinite waits but cannot repair Music's internal state.

## Development

Run `npm test`, `npx tsc --noEmit`, `npm run build`, and `npm run lint`.
The regression suite covers subprocess handling, search ranking, metadata parsing, and generated scripts. Playback, cloud sync, and station behavior also need testing in Raycast with Music on macOS.
