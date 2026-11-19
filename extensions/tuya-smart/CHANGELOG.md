# Tuya Smart Changelog

## [Redesigned List, Error Handling, Light Controls, Menu Bar, AI Tools and Shortcuts] - 2026-09-01

- Pinning is now per device rather than per switch, which is what the redesigned list
  shows. Pins set in an earlier version are not carried over and need setting again.
- Added a Temperature Unit preference. Temperatures follow the device's own setting by
  default, matching the Tuya app; Celsius or Fahrenheit can be forced for devices that
  never report one.
- The details side panel is now off by default and toggles with Cmd+Shift+D. It used
  to be always open, which squeezed the list column and cut off the state, battery and
  offline labels.
- The menu bar now shows sensors and locks with their actual readings, such as a
  contact sensor's open or closed state, temperature and remaining battery, rather than
  listing them with nothing useful attached. Its icon warns when something needs
  attention, like a window left open.
- AI tools now answer in plain sentences and act on a request to switch something
  instead of listing devices and asking which one was meant.
- AI tools now see every non-sensitive detail of a device, both formatted for reading
  and raw for comparison. Lock credentials, device keys and the home address are
  deliberately withheld.
- Turning a device on no longer asks for confirmation; turning one off still does,
  since an account can include a fridge or a router.
- AI tools now report sensor readings and battery level, so questions like how much
  battery a sensor has left can be answered instead of only whether it is online.
- Fixed menu bar items appearing to do nothing when clicked. A menu bar command has no
  view, so failures were being reported to a toast that could never be displayed.
- Redesigned the device list. Devices are grouped by what they do (Controls, Sensors,
  Locks) and each one now appears exactly once; sockets used to be listed twice, once
  as a device and again as a bare "switch_1" row.
- Readings are now formatted: a temperature that arrived as "294" reads as 29.4°C, a
  contact sensor says Open or Closed instead of true or false, and battery level is
  shown next to each device that has one.
- Devices needing attention, such as a flat battery, are flagged in the list.
- Encoded internal data points are hidden from the details view; a smart lock went from
  22 rows of mostly base64 to the 11 that mean something.
- Offline devices are now marked as such.
- Device categories always show their readable name instead of codes like "cz".
- Refreshing is cheaper: instruction sets are now fetched in batches of twenty devices
  instead of one request per device. The device list itself is still paginated.
- Tuya API failures are now reported instead of being swallowed. An expired IoT Core
  subscription previously showed an endless loading spinner or an empty device list
  with no explanation; it now shows what went wrong and what to do about it.
- Added brightness and colour temperature control for light devices, using each
  product's own reported range.
- Restored the controls for data points that take one of a set of values: a curtain
  offers Open, Stop and Close again, and a light its work modes. The options come
  from the range each product reports rather than a list fixed per category.
- Added a menu bar command to toggle pinned switches without opening Raycast.
- Added a Control Device command that takes arguments, so a device can be controlled from
  a deeplink through Apple Shortcuts and, through Shortcuts, by voice with Siri. Thanks to
  @anwarulislam, who proposed this and wrote the first version of it.
- Added AI tools to list devices, toggle a switch, and set brightness by voice or chat.
- A request that names a device with several switches without saying which one is now
  refused, whether it comes from an AI tool or a shortcut. The reply lists the switches to
  choose from. It previously operated whichever switch the device happened to report first.
- Fixed the device details view showing a meaningless "Active Time".
- Fixed devices with identical names hiding each other in the list.
- Fixed the On/Off filter not applying to the devices section.
- Fixed turning a switch off reporting that it had been turned on.
- The rename form now opens with the current name instead of an empty field.
- The details view of an unrecognised device category now lists its data points
  instead of rendering nothing.
- Added local network control as a fallback: when the Tuya cloud is unavailable
  because the IoT Core subscription has lapsed, the extension keeps working from its
  cached device list and sends commands directly to devices on the same network.
- Updated to Raycast API 2.0 and resolved outstanding axios security advisories.

## [Security Maintenance] - 2026-05-21

- Updated the extension to address security advisories.

## [Fix] - 2026-05-15

Fixed a bug that caused the extension to crash when no older devices were listed

## [Enhancement] - 2026-01-15

- Added switches in root search

## [Fix] - 2026-01-07

Fixed an error that caused the extension to crash

## [Enhancement] - 2023-02-28

- Added commands to set Status and Work Mode for Light Source devices.

## [Fix Action] - 2023-02-12

- Fixed Pin Device Action

## [Initial Version] - 2023-02-09

- Added Tuya Smart Command
- Added Support for Switches
- Added Support for Courtains
- Added Support for Sockets
