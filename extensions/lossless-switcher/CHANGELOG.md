# Lossless Switcher Changelog

## [Initial Release] - {PR_MERGE_DATE}

- **Now Playing** view: live track + audio format with album artwork and structured metadata sidebar (sample rate, bit depth, codec, rendition, output device, daemon status)
- **Switch Audio Format** view: manually pick from the DAC's full sample-rate / bit-depth list
- **Toggle Auto-Follow** no-view command: enable / disable the daemon's auto-switching
- **Lossless Status** menu-bar command: live sample rate at-a-glance, refreshes within ~1s of track change via daemon-side deeplink trigger
- **Uninstall Daemon** command: clean removal of the LaunchAgent and cached data
- Headless Swift daemon installed as a user LaunchAgent on first run; tails Music.app's MediaToolbox log stream and applies the source format to the default output device via CoreAudio HAL
- Old Alfred workflow detection with one-click cleanup action
