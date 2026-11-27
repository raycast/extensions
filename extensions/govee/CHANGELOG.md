# Govee Changelog

## [Cloud, Snapshots, Music, Subsection Coloring and More] - 2026-11-25

- Optional Govee API key: control lights without LAN Control (e.g. bulbs) and virtual groups through the Govee cloud; lights on LAN still use LAN
- More reliable LAN discovery: repeated scans, a single shared connection, and the cloud as a fallback
- LAN lights use their names from the Govee app when an API key is set
- Enter toggles a light; ⌘↵ turns it on, ⌘⇧↵ turns it off; the light's state is checked before toggling
- Reorder and hide devices, scenarios, snapshots and music modes; choose the order of sections in settings
- Snapshots from the Govee app, with color tags guessed from their names or set by hand, and quicklinks
- Music modes with a shared mic sensitivity
- Set White Temperature (Kelvin), over LAN where supported
- Subsection Coloring: split or blend a few colors across a strip's segments, instantly over LAN on supported models
- Save Current as Scenario, quick fade in scenarios, and tags on scenario, snapshot and device rows
- Rename and Reset Name for lights
- Color search by hex code or color word
- Optional Govee Menu Bar command
- Keyboard shortcuts follow Raycast's common shortcuts

## [Security Maintenance] - 2026-05-21

- Updated the extension to address security advisories.

## [Updates] - 2024-07-28

- Removed race condition (minor bug in code that cause unnecessary error)
- Updated dependencies, rewrote some local storage functionality
- Add Quicklinks for scenarios

## [Initial Version] - 2024-04-19
