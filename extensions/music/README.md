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

Catalog playback requires an Apple Music subscription, Music signed in, Raycast's
**Automation** permission to verify playback, and **Media & Apple Music** permission
for the bundled **Raycast Music Player** helper. The first use can display a normal
macOS consent dialog. Denied access is reported without falling back to another song.

The helper sends the exact catalog song ID to Music's system player. It does not
open a Music URL, select UI elements, simulate keys, add a library item, or manipulate
Music's windows. The current queue is replaced with the selected song; volume and
shuffle are not modified. A minimized Music window stays minimized in the tested
configuration.

The extension independently verifies the title, artist, album and advancing
playback position via AppleScript. Unverified playback is paused and reported as
an error; success is never inferred from the launcher exit status. Concurrent
catalog requests are rejected with a native macOS lock. The helper has a deadline
and stops if its calling process or request directory disappears.

The extension does not send an additional catalog playback notification.
Music's own track-change alerts and their settings are left untouched.
**Open in Music** remains a separate, explicit action. Albums, playlists and
library playback retain their existing behavior.

### Compatibility limitation

This is a local experimental integration: the MediaPlayer system-player methods
are present at runtime but are **not public macOS SDK APIs**. Real playback with a
minimized Music window was tested on macOS 27 / Apple silicon. Intel is compiled,
not hardware-tested. Other macOS versions and future updates are not guaranteed.
Unsupported APIs fail explicitly; there is no hidden URL/UI fallback.

The small bundled helper includes its full source and build script in `native/`.
It is ad-hoc signed for local use, not Developer ID signed or notarized. Changing
its executable can require granting Music access again. Raycast Store acceptance
and a public distribution/signing strategy must be reviewed before an upstream PR;
see [Raycast's binary dependency guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store#binary-dependencies-and-additional-configuration).

## Troubleshooting

- Enable **Start Playlist** in Raycast Settings → Extensions → Music. It is disabled by default.
- **Add to Playlist** favorites the current track when you choose Music's smart Favorite Songs or Favourite Songs playlist. **Favorite Track** does the same directly.
- Music may not expose a station's current track to AppleScript. If Add to Playlist cannot access it, add the song in Music first.
- If **Add to Library** creates an entry with an incorrect date or does not sync it to your cloud library, use **Search Apple Music** and its **Add to Library** action. That command uses the Apple Music API and requires sign-in. The current-track shortcut still uses Music's AppleScript duplication command.
- If Music stops responding after sleep, reopen Music and retry. Script timeouts prevent indefinite waits but cannot repair Music's internal state.

## Development

After changing native sources, run `npm run build:native` on macOS with Xcode Command Line Tools. The reproducible command builds arm64 and x86_64 and verifies the bundle signature. Normal TypeScript builds reuse that asset.

Run `npm test`, `npx tsc --noEmit`, `npm run build`, and `npm run lint`.
The regression suite covers subprocess handling, search ranking, metadata parsing, and generated scripts. Playback, cloud sync, and station behavior also need testing in Raycast with Music on macOS.
