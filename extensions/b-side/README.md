# B-Side for Raycast

Play, pause, skip and start a vibe in [B-Side](https://b-side.anhile.com)
from Raycast. Give each command a hotkey in Raycast's settings to control
the music from anywhere.

| Command | Does |
|---|---|
| Play or Pause | Plays or pauses |
| Next Track | Skips to the next track |
| Previous Track | Goes back a track |
| Play Vibe | Starts the first vibe |
| Show Now Playing | Brings B-Side forward, on Now Playing |

The commands are `bside://` URLs, so B-Side starts if it is not running.

## Install

```bash
cd raycast
npm install
npm run dev
```

`npm run dev` adds the extension to Raycast; it stays after you stop it.
