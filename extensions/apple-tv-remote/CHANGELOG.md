# Apple TV Remote Changelog

## [Play and resume, Netflix, Spotify, YouTube, wake on open] - 2026-11-20

- The installed-app list works again on tvOS 26. The extension now opens a TV Remote Client session before asking, which tvOS requires before it will answer the app-list query. Launch Apple TV App shows everything installed, and "open <app>" resolves against it
- A refused launch is now reported as a failure instead of "Launched". tvOS answers a rejected request with an error frame that previously read as success. Deep links that the TV refuses fall back to universal search
- Pairing help on the setup screen: what to do when no PIN appears (restart the Apple TV; a tvOS 26 bug can finish the handshake without drawing it) and why repeated failed attempts should wait for a restart
- Inline validation on the pairing and manual-IP forms
- Menu bar buttons report a failure instead of doing nothing when the Ask Apple TV command is unavailable. Ask Apple TV failures show as toasts
- Fix: a very short app name could launch an unrelated app whose name contained it
- "pause" and "play" (in Ask Apple TV and Raycast AI) now send the Apple TV's own Pause and Play commands, so repeating one changes nothing. Before, both toggled, so "pause" could resume something already paused. The Play/Pause button still toggles
- Opening the remote wakes the Apple TV, the way the iPhone remote does
- An Apple TV that does not answer (asleep, restarting, new address) now reports "Apple TV Unreachable" instead of "Pairing Expired". Re-pairing never helped there and set off tvOS's pairing backoff
- Fix: a manually added Apple TV lost its pairing after its address was re-discovered
- Fix: Ask Apple TV no longer lowercases what it sends, so "type" keeps capitals and deep-link URLs stay intact
- The Companion port hint no longer claims a fixed 49152 to 49155 range. tvOS picks the port and can change it
- "play <title>" on Netflix now opens the show in Netflix from any Netflix screen, including the player and the profile picker: it types the title into Netflix's own search and opens the top result. Before, Netflix titles went to Apple TV Search, which has no Netflix results and could open the show in another app
- The extension now reads what the Apple TV is playing (app, title, position) from tvOS's now-playing reports. "play <title>" confirms playback actually started and says where it resumed, and Ask Apple TV answers "what's playing". The library introduced itself without a client ID, which tvOS answers by sending no state updates
- "play <title>" prefers a streaming service installed on the Apple TV and, by default, resumes: it presses the title page's own Play button, which continues from the last episode watched in Netflix, Disney+, and Max. The Search Automation preference is now Play Automation, with Play as the default
- YouTube: "play <query> on youtube" plays the top result, and "play the latest <channel> video" plays that channel's newest upload. YouTube links now confirm tvOS's "Open in YouTube?" prompt, which used to stop them on screen
- "play <title>" opens HBO Max titles directly. tvOS refuses the hbomax.com links JustWatch returns, so they are rewritten to the play.hbomax.com form the app accepts
- The Apple TV Search fallback works on tvOS 27: it steps past the new "Search In" app row (which opened a YouTube search) and picks up a search screen left open from last time. Typed titles are read back before anything is opened
- "play <title>" runs the deep link, search, and app fallbacks over one connection instead of up to three
- "play <title> on yt" and other app nicknames now match the streaming provider, not only its exact name
- Menu bar app items and app quicklinks open apps by bundle ID, so they always open the exact app
- Setup is simpler: pairing help sits under the PIN field instead of behind extra screens
- Removed the Connection Timeout preference; the extension now uses a fixed 8 second limit

## [Menu bar icon] - 2026-07-03

- New menu bar icon: an Apple TV remote that adapts to light and dark

## [Update store icon] - 2026-07-03

- New extension icon featuring the Apple TV Siri Remote

## [Apple TV Remote] - 2026-07-01

- Visual Apple TV remote with a persistent connection, clickable button grid plus a no-modifier keyboard layer (WASD/HJKL, F select, Space play/pause) and ⌥-shortcuts
- Bonjour discovery + on-screen PIN pairing, with manual IP/port fallback
- Full Siri Remote function set ported from pyatv: context menu (hold-select), app switcher, Control Center, ±10s skip, sleep/wake, screensaver
- App launcher grid backed by the device's live app list, with hotkey-able Quicklinks per app
- Ask Apple TV: one-shot natural-language commands (pause, open an app, type text, play a show)
- Title playback via real JustWatch-resolved deep links where tvOS supports them, with an Apple TV universal-search typing flow for Netflix and unresolved titles
- Menu bar quick controls and per-key commands (disabled by default) for global hotkeys
- AI tools: press remote keys, launch apps, play content, sleep/wake, usable from Raycast AI chat and Quick AI
