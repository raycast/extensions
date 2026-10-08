# Hue Changelog

## [Optimistic scene updates] - {PR_MERGE_DATE}

- Show the selected scene on its room immediately
- Show room, scene and light images instantly
- Show the bridge's error message when changing a light, room or scene fails
- Show connection errors in a HUD when toggling all lights fails
- Fix live updates from the bridge stopping or skipping changes
- Fix zones showing as off after turning off a room while other lights in them are on
- Fix toggling all lights ignoring the manual bridge IP address and username preferences
- Fix Set Scene opened from Control Groups not updating while open
- Fix the loading indicator not showing after the first launch
- Fix holding a room or zone's brightness shortcut showing errors and jumping back
- Fix the Set Brightness icon of rooms and zones showing less than the actual brightness
- Fix light icon symbols always being black; they're now black or white, whichever stands out more
- Fix Control Lights loading forever when the bridge has no lights
- Fix the names of the Steel Blue and Old Lace colors
- Remove entertainment areas from the Control Groups description, as the command never listed them
- Fix the bridge screens calling the Unlink Saved Hue Bridge action by another name
- Fix scene images ignoring the brightness of the scene's palette colors
- Fix the color temperature actions forgetting a light's own limits after its temperature changes
- Fix changing the color temperature of a light set to a color; it now starts from the nearest white, or the middle for strong colors, instead of jumping to the coolest
- Fix plugs offering brightness actions after a room's brightness changes, and color-only lights offering color temperature actions after a scene is set
- Show a certificate error at once when the bridge's certificate doesn't match, instead of timing out
- Keep connecting to bridges after Signify moves them to its secondary root certificate
- Fix bridge discovery hanging when MeetHue's discovery service returns an unexpected response
- Find the bridge with mDNS first, as Philips recommends, with MeetHue's discovery service as the fallback
- Fix the Toggle All Lights message when some lights fail, which said "Turned on" when turning off and miscounted the failures
- Show each color once in room, zone and scene images, like the Hue app, so a color several lights share no longer fills most of the image, even when their settings differ slightly
- Shade room, scene and light images like the Hue app, darker as brightness drops, with colors from warm to cool and the outer ones in full
- Show only the colors of lights that are on in room and zone images
- Show scenes at their own brightness instead of all looking dim
- Show each room and zone's icon on its Control Groups tile, as in the Hue app
- Draw whites in the Hue app's colors, from warm yellow to cool mint, and lights without color, like plugs, in its cream
- Update the Raycast API and utilities

## [Improvements] - 2026-06-01

- Fix crash when setting a scene with certain light colors
- Fix manual bridge IP setup failing when no bridge was previously discovered
- Downgrade expected network errors (timeouts, connection refused, etc.) and rate limit responses to warnings
- Treat bridge firmware update errors as expected
- Update dependencies

## [Update HTTPS support] - 2025-12-25

- Add CA Certificate
- Fix bridge ID matching
- Drop support for self-signed certificates, as all Hue Bridges can now be updated to use HTTPS with a valid root
  certificate
- Update dependencies

## [Improvements and bug fixes] - 2025-12-23

- Add Windows support
- Improve interactivity when updating lights and groups
- Improve wording
- Fix NaN error in color helpers

## [Fix support for old Hue bridges] - 2024-10-27

- Fix a self-signed certificate bug when connecting to older Hue Bridges

## [Small improvements] - 2024-01-15

- Improve wording in readme and preferences
- Add fallback icon

## [Fix] - 2023-11-21

- Fixed bugs
- Updated dependencies

## [Add plug icon] - 2023-10-18

- Add an icon for a plug

## [Bug fixes] - 2023-08-30

- Hide dimming actions when a light does not support them
- Fix bug where toggling a group on will set its brightness to the lowest possible setting
- Fix “Toggle All Lights” behaviour
  - When no lights are on, all lights will turn on
  - When some, but not all lights are on, the preference will be used (default: Turn all off)
  - When all lights are on, all lights will turn off

### Known issues

- Transition Time preference does not apply to toggling groups, as this causes the group to turn on with minimal
  brightness due to a bug in the Hue V2 API.

## [Bug fix] - 2023-06-30

- Fixed a bug where the extension would not store the username/API key after linking the Hue Bridge

## [Connectivity update] - 2023-06-22

- Connectivity
  - Update Hue Bridge discovery and linking code
  - Add retry action when no Hue Bridge was found
  - Enable setting manual IP address and/or username (API key)
  - Improve how error messages are shown when linking a Bridge
- Front end
  - Use coloured squares with icons in them for lights
  - Improve scene/group gradients
  - Improve responsiveness when toggling groups
  - Rate limit group toggle action
- Rework "Turn Off All Lights" into "Toggle All Lights"
  - Turns off all lights if any are on, turns on all lights if all are off.
  - Updates state in background every 10 minutes to help "stale while revalidate"

## [Hue Extension 2.0] - 2023-04-17

- Show groups and scenes as gradients
- Show lights as tinted icons
- Use rate limiting to improve behaviour when holding down a hotkey and to prevent rate limiting errors
- Update the UI when lights are changed by e.g. the Hue app or a physical switch
- Many improvements under the hood to improve performance, responsiveness and reliability
  - Use Hue API V2: ‘Connected Lighting Interface Protocol’ or CLIP
  - Connect with the Hue Bridge using TLS (HTTPS) and HTTP/2
  - Use a single persistent connection to send and receive data to and from Hue bridge
- Deprecation: It is no longer possible to set/adjust the color (temperature) of a group since this is not supported by
  the Hue API V2. It may be added in the future with a workaround. Please use scenes or individual lights instead.

You will need to re-link your Hue Bridge to use the new version.

## [Fixes and Enhancements] - 2023-03-29

- Fix too many network requests resulting in rate limiting (429) errors
- Update dependencies
- Clean up code

## [Added Hue] - 2022-09-10

- Add command for linking your Hue Bridge
- Add commands for controlling Hue groups, scenes and individual lights
- Add support for changing/setting brightness, color, color temperature and scenes
- Add command for turning off all lights
