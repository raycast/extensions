# Brain.fm

Control your signed-in Brain.fm web player from Raycast on macOS.

## What's new

- New **Brain.fm Menu Bar** command with the current track, timer and play/pause/skip controls.
- Added Brave, Microsoft Edge and Vivaldi as supported browsers.

## Commands

- **Now Playing** shows the current track, timer, playback state, and browser Media Session information. Its actions control playback and refresh the status.
- **Play** and **Pause** are idempotent: calling Play while already playing, or Pause while already paused, leaves playback in that state.
- **Play/Pause** toggles the current session.
- **Skip Track** and **Previous Track** use the corresponding Brain.fm player buttons and confirm a new track title before reporting success. When titles are unavailable, a changed audio source path is the fallback. Renewed query tokens and fragments are ignored.

## Setup

1. Select **Dia** or **Google Chrome** in the extension preferences.
2. Open [my.brain.fm](https://my.brain.fm/) in that browser and sign in using the normal Brain.fm flow. Start a session in the web player once.
3. Keep one Brain.fm player tab open. Payment and login tabs are excluded. Multiple player tabs are rejected to avoid controlling the wrong session.
4. Run **Now Playing**. macOS may ask you to allow Raycast to control the selected browser. Google Chrome also requires its **View → Developer → Allow JavaScript from Apple Events** setting. The extension does not change these permissions or settings for you.

No Brain.fm password, session token, or API key is entered into Raycast. The extension reads and clicks only the official web player through the selected browser's documented AppleScript interface. It does not call private Brain.fm endpoints or internal player events.

## Media keys

Brain.fm already registers its own browser Media Session handlers for play, pause, next track, and previous track. This extension preserves them. Its Raycast commands target Brain.fm directly and never send global media-key events to another music app.

Hardware media keys are routed by macOS and the browser to their active media session. If another app receives them, resume Brain.fm in its player or select it in the browser's media controls. The Now Playing view reports the browser's declared media-session state; `none` can mean the browser is inferring state from the audio element rather than the page declaring it explicitly.

The extension does not install a global key listener or change system keyboard assignments.

## Limits

This is an unofficial UI integration. Brain.fm's player must be signed in, have playable account access, and be loaded in the selected browser. The current player UI uses stable test identifiers and accessible labels, but a vendor UI change may require an extension update. Browser autoplay rules may require a first manual session start. The official Brain.fm desktop app and other browsers are not controlled by this package.

Track controls may report that verification is unavailable when Brain.fm selects a different variant with the same visible title. Verification stays pinned to the original browser and player tab; closing that tab cannot make another tab count as a successful result.

## Development

```sh
npm install
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```

## Sources

- [Brain.fm web player](https://my.brain.fm/)
- [Brain.fm desktop and web setup](https://www.brain.fm/download)
- [Dia AppleScript and Raycast integration](https://www.diabrowser.com/changelog/mac/1-7-0); the installed Dia scripting dictionary also exposes its tab `execute javascript` command.
- [Chromium AppleScript interface](https://chromium.googlesource.com/chromium/src.git/+/lkgr/chrome/browser/ui/cocoa/applescript/scripting.sdef) and [automation requirements](https://www.chromium.org/developers/applescript/)
- [Raycast runAppleScript](https://developers.raycast.com/utilities/functions/runapplescript)
- [Media Session specification](https://w3c.github.io/mediasession/)
- [Existing Spotify Player control flow](https://github.com/raycast/extensions/blob/main/extensions/spotify-player/src/togglePlayPause.ts), inspected for command semantics and verification expectations.

The icon is Brain.fm's official web app icon, obtained from its public web app manifest. Code is MIT licensed. Brain.fm is a trademark of its owner; this extension is not affiliated with Brain.fm.
