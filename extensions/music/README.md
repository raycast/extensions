<p align="center" style="display:flex">
	<img width="50" src="./assets/icon.png">
</p>

# Music

> Apple music extension

![sc1](./assets/screnshot-1.png)
![sc2](./assets/screnshot-2.png)

## Troubleshooting

- Enable **Start Playlist** in Raycast Settings → Extensions → Music. It is disabled by default.
- **Add to Playlist** favorites the current track when you choose Music's smart Favorite Songs or Favourite Songs playlist. **Favorite Track** does the same directly.
- Music may not expose a station's current track to AppleScript. If Add to Playlist cannot access it, add the song in Music first.
- If **Add to Library** creates an entry with an incorrect date or does not sync it to your cloud library, use **Search Apple Music** and its **Add to Library** action. That command uses the Apple Music API and requires sign-in. The current-track shortcut still uses Music's AppleScript duplication command.
- If Music stops responding after sleep, reopen Music and retry. Script timeouts prevent indefinite waits but cannot repair Music's internal state.

## Development

Run `npm test`, `npx tsc --noEmit`, `npm run build`, and `npm run lint`.
The regression suite covers subprocess handling, search ranking, metadata parsing, and generated scripts. Playback, cloud sync, and station behavior also need testing in Raycast with Music on macOS.
