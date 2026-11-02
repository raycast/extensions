# B-Side for Raycast

Play, pause, skip, like the track and choose a vibe in [B-Side](https://b-side.anhile.com)
from Raycast. Give each command a hotkey in Raycast's settings to control
the music from anywhere.

| Command | Does |
|---|---|
| Play or Pause | Plays or pauses |
| Next Track | Skips to the next track |
| Previous Track | Goes back a track |
| Like Track | Likes the track that plays |
| Choose Vibe | Lists your vibes and starts the one you pick |
| Show Now Playing | Brings B-Side forward, on Now Playing |

The commands are `bside://` URLs, so B-Side starts if it is not running.
Like Track and Choose Vibe need B-Side 0.3 or later.

## Install

```bash
cd raycast
npm install
npm run dev
```

`npm run dev` adds the extension to Raycast; it stays after you stop it.
