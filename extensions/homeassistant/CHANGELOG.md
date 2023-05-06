# Home Assistant Changelog

## [Update] - 2023-05-04

- Hide hidden or disabled entities
- Add `Assist` root command

## [Fix] . 2023-03-15

- Inject https agent only on `https` urls - fix [#5358](https://github.com/raycast/extensions/issues/5358)

## [Fix] - 2023-03-08

- Fixed that some commands didn't fully support ignore certs preference.

## [Weather Menu Bar] - 2022-11-28
- Add weather entity menubar command

## [Fix Script Edit Action] - 2022-11-19
- Fix wrong entity id when edit a script

## [Timestamps] - 2022-11-14
- Add `last_updated` and `last_changed` states as tooltip as well as to the attributes list
- Add HACS pending updates to `Updates` command if HACS is installed

## [Video Stream Actions] - 2022-11-01
- Add action to open a camera video stream in VLC, IINA and the Browser

## [Zones] - 2022-10-31
- Add Grid View support for cameras
- Add QuickLook support for cameras in Grid View
- Add sections for `Update`, `Motions` and `Windows` commands
- Add `Zones` command
- Persons will now show the avatar if available
- Add icon support for `device_tracker` entities
- Add `Copy Key to Clipboard` action to attribute list items
- Add `Open in Google Maps` action for persons

## [Window Support] - 2022-08-09
- Add icon and state support for window device class
- Add actions to `Edit` or `Debug` scripts or automations in the browser
- Add action to `Edit` scenes in the browser
- Add Notifications Menubar
- Add icon support for device classes `power_factor` and `energy`

## [Fan entity support] - 2022-06-18
- Adds support for Fan entities

## [Weather entity support] - 2022-05-03
- Add support for weather entities (daily and hourly)

## [Dynamic temperature options] - 2022-05-02
- The properties of base temperature options for climate entities (min_temp, max_temp, and target_temp_step) are now used for the climate entity instead of a hardcoded list.

## [Add door support] - 2022-04-24
- Add icon and state support for device class `door`
- Add root command `Doors` to filter entities of device class `door`
- `update` entities now show `in progress` state when an update is running

## [Add support for update entities] - 2022-04-08
- Add support for update entities from HA 2022.04
- Add Turn On and Turn Off actions for media players

## [Added support for helpers and auto camera image fetching] - 2022-04-03
- Increase max. entities to `1000`
- Remove Initial state flickering
- Camera now auto fetch the image
- Add `Helpers` root command
- Add `input_boolean` support
- Add `input_number` support
- Add `input_datetime` support
- Add `input_select` support
- Add `input_button` support
- Add `input_text` support
- Add `timer` support
