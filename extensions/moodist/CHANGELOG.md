# Changelog

## [New Catalog, Menu Bar Controls, and AI] - {PR_MERGE_DATE}

- Replaced the 22 bundled sounds with the full Moodist catalog of 89 sounds in 9 categories, downloaded on first play and cached
- Removed the bundled Swift player, so the extension now works on Intel Macs and no longer needs Swift to build
- Mix Sounds now filters by category or by what is in the mix, steps volume in 5% increments, and can pause, resume, set master volume, and save a preset
- Pausing keeps the mix, and paused sounds stay visible so you can resume them
- The sleep timer now fires even when the menu bar command is disabled or Raycast is closed, and accepts up to 24 hours
- The menu bar can change a sound's volume, remove a sound, set master volume, and cancel the timer
- Added AI tools to list sounds, play sounds, stop sounds, and play a saved preset
- Default Volume is now a dropdown
- Saved presets move to the new sound catalog automatically
- Presets can be pinned, and are ordered by pinned and then most recently used
- Manage Presets and the menu bar show which preset is playing, and when the mix has changed since loading it
- Added a Play Preset command, and a Create Quicklink action to give any preset its own hotkey
- Preset names must now be unique
- Stop All Sounds no longer kills unrelated processes named `looper`
- Removed the Keep Alive background command

## [Fix] — 2026-08-21

- Reduced background keep-alive checks to once per minute.

## [1.0.0] — 2026-04-08

Initial release.

- 22 ambient sounds across 4 categories: Nature, Urban, Electronic, Binaural
- Layer multiple sounds with individual volume control
- Master volume control
- Save and load mix presets
- Sleep timer with auto-stop
- Menu bar controls with playback state
- Quick toggle playback command
