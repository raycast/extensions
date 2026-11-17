# Weather Fox Changelog

## [Fix stale shared images] - 2026-11-09

- Fixed pasting a second location's image showing the previous one in apps that cache attachments by file name: every copy or paste now gets its own file (named after the location and time), and only the last few are kept
- Radar no longer shows missing tiles for places near the antimeridian or after panning across it
- Rain nowcast no longer announces rain for 15-minute intervals that have already passed

## [Initial Release] - 2026-11-04

- Current conditions, 24-hour temperature curve, and 7 or 16-day forecast with hand-drawn SVG hero scenes
- Today view with rain nowcast (15-minute precipitation) and the next 10 hours
- Animated precipitation radar (RainViewer) with zoom, pan, and animated GIF export
- Air quality and pollen, phase-accurate moon, and US National Weather Service alerts
- Menu bar command with glanceable current conditions (macOS)
- Cast Weather Fox: an animated fox acting out the live weather, time of day, and season
- Eight visual themes, metric or imperial units, multiple saved locations, guided first launch
- Copy, paste, or save forecast images and Cast scenes (macOS)
- Runs on macOS and Windows, with platform-specific keyboard shortcuts
