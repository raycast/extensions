# Hue Changelog

## [Fix support for old Hue bridges] - 2024-10-27

- Fix a self-signed certificate bug when connecting to older Hue Bridges

## [Small improvements] - 2024-01-15

- Improve wording in readme and preferences
- Add fallback icon

## [Fix] - 2023-11-21

- Fixed bugs
- Updated dependencies

## [Add plug icon] - 2023-10-18

* Add an icon for a plug

## [Bug fixes] - 2023-08-30

* Hide dimming actions when a light does not support them
* Fix bug where toggling a group on will set its brightness to the lowest possible setting
* Fix “Toggle All Lights” behaviour
  * When no lights are on, all lights will turn on
  * When some, but not all lights are on, the preference will be used (default: Turn all off)
  * When all lights are on, all lights will turn off

### Known issues

* Transition Time preference does not apply to toggling groups, as this causes the group to turn on with minimal
  brightness due to a bug in the Hue V2 API.

## [Bug fix] - 2023-06-30

* Fixed a bug where the extension would not store the username/API key after linking the Hue Bridge

## [Connectivity update] - 2023-06-22

* Connectivity
  * Update Hue Bridge discovery and linking code
  * Add retry action when no Hue Bridge was found
  * Enable setting manual IP address and/or username (API key)
  * Improve how error messages are shown when linking a Bridge
* Front end
  * Use coloured squares with icons in them for lights
  * Improve scene/group gradients
  * Improve responsiveness when toggling groups
  * Rate limit group toggle action
* Rework "Turn Off All Lights" into "Toggle All Lights"
  * Turns off all lights if any are on, turns on all lights if all are off.
  * Updates state in background every 10 minutes to help "stale while revalidate"

## [Hue Extension 2.0] - 2023-04-17

* Show groups and scenes as gradients
* Show lights as tinted icons
* Use rate limiting to improve behaviour when holding down a hotkey and to prevent rate limiting errors
* Update the UI when lights are changed by e.g. the Hue app or a physical switch
* Many improvements under the hood to improve performance, responsiveness and reliability
  * Use Hue API V2: ‘Connected Lighting Interface Protocol’ or CLIP
  * Connect with the Hue Bridge using TLS (HTTPS) and HTTP/2
  * Use a single persistent connection to send and receive data to and from Hue bridge
* Deprecation: It is no longer possible to set/adjust the color (temperature) of a group since this is not supported by
  the Hue API V2. It may be added in the future with a workaround. Please use scenes or individual lights instead.

You will need to re-link your Hue Bridge to use the new version.

## [Fixes and Enhancements] - 2023-03-29

* Fix too many network requests resulting in rate limiting (429) errors
* Update dependencies
* Clean up code

## [Added Hue] - 2022-09-10

* Add command for linking your Hue Bridge
* Add commands for controlling Hue groups, scenes and individual lights
* Add support for changing/setting brightness, color, color temperature and scenes
* Add command for turning off all lights
