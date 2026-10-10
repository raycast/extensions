# Hue Changelog

## [Hue app look and bug fixes] - {PR_MERGE_DATE}

- Restyle tiles after the Hue app: its colors and whites, shading that darkens with brightness, and its translucent off cards instead of a crossed-out bulb
- Show each room and zone's icon on its Control Groups tile, and draw all icons as sharp vector shapes from the Hue app, in black or white, whichever stands out
- Show each color once in room, zone and scene images, and only those of lights that are on
- Fix room and zone images showing their colors out of order when a light is set to a white from Set Color
- Show scenes at their own brightness instead of all looking dim
- Mark active scenes with a light bulb icon below the tile instead of an emoji in their name
- Show images instantly
- Update lights, rooms, zones and the active scene at once when setting a scene, turning a room or zone on or off, or changing a light
- Rename Increase and Decrease Color Temperature to Make Cooler and Make Warmer
- Fix Make Cooler and Make Warmer losing a light's own range after a change, and jumping to the coolest white from a color
- Fix holding a room or zone's brightness shortcut showing errors and jumping back
- Fix the Set Brightness icon of rooms and zones showing less than the actual brightness
- Fix plugs, and rooms and zones of only plugs, offering brightness actions
- Fix Set Scene opened from Control Groups not updating while open, and failing to set scenes when opened while connecting
- Fix live updates from the bridge stopping or skipping changes
- Fix the loading indicator not showing after the first launch, and Control Lights loading forever without lights
- Show the bridge's error message when an action fails
- Say when the connection to the bridge is lost or the bridge is busy, instead of showing parsing errors
- Offer Retry when loading from the bridge fails
- Fail a change after 5 seconds when the bridge doesn't answer it, instead of holding up every later change
- Fix Toggle All Lights ignoring the manual bridge preferences, hiding connection errors, and misreporting partial failures
- Find the bridge on the local network first, so Retry no longer uses up MeetHue's discovery limit, and fix discovery hanging on an unexpected MeetHue response
- Fall back to MeetHue's discovery after 3 instead of 10 seconds when the local network doesn't answer, and ask the local network twice
- Show each bridge setup toast once and hide it when its step ends, also when unlinking midway
- Fix the Failed to link with bridge toast showing as a success
- Ask to press the bridge's link button when only the bridge IP preference is set, instead of failing to link
- Find the bridge again when its address changes, keeping the link, instead of having to unlink and link again
- Offer to link again when the bridge no longer accepts the extension, keeping its saved address, instead of only unlinking
- Validate the bridge IP preference again after Unlink
- Fix Done after linking connecting to the bridge a second time
- Stop using the unlinked bridge's connection after Unlink
- Show an error instead of crashing when the saved bridge configuration can't be read or saved
- Keep connecting to bridges after Signify moves them to its secondary root certificate, and report a certificate mismatch at once instead of timing out
- Fix the names of the Steel Blue and Old Lace colors and the Unlink Saved Hue Bridge action

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
