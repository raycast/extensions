# Hue Changelog

## [Hue Extension 2.0] - 2023-04-10

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

## [Fixes and Enhancements] - 2023-03-29

* Fix too many network requests resulting in rate limiting (429) errors
* Update dependencies
* Clean up code

## [Added Hue] - 2022-09-10

* Add command for linking your Hue Bridge
* Add commands for controlling Hue groups, scenes and individual lights
* Add support for changing/setting brightness, color, color temperature and scenes
* Add command for turning off all lights
