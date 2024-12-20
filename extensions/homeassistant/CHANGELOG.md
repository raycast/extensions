# Home Assistant Changelog

## [Update] - 2024-12-17

- Fixed grammar in alert message of the `Updates` command.
- Removed unnecessary emoji from the update status of the `Updates` command.

## [Update] - 2024-12-16

- Updated search bar placeholder of the `Assist` command.
- Fixed icon color of the `Assist` command.

## [Update] - 2024-12-06

- Renamed `Mediaplayers` and `Mediaplayer Menu` commands to `Media Players` and `Media Player Menu`.
- Updated action icons for the `Stop` action in `Vacuum Cleaners` and `Mediaplayers` commands.
- Updated shortcuts that were removed because they are reserved by Raycast.
- Rewrote command descriptions for better readability and conciseness.

## [Update] - 2024-09-19

- Corrected typos and improved the overall readability of the extension documentation and interface.

## [Update] - 2024-09-18

- Enhanced the display of climate entity states to show temperature and operating mode in separate item accessories with icons.
- Added new fan and swing modes actions when applicable to the climate entity.
- Added toast messages to climate actions.

## [Weather] - 2024-07-25

- Use `weather.get_forecasts` to receive weather forecasts (required since Home Assistant `2024.07`)
- Add sun entity support for weather menu command
- Add `Services` and `Run Service` command to be able to call Services (including Quicklinks/Deeplinks)
- Menu items show the last update/last change info
- Add `Calendar` and `Calendar Menu` command

## [Update] - 2024-04-06

- Sort `StatesList` in alphabetical order

## [Update] - 2024-01-27

- Add three Single Entity Menu Commands, two disabled by default

## [Update] - 2024-01-19

- Make use of cache for faster loading of entities

## [Companion] - 2023-12-22

- Add support for Home Assistant Companion app

## [New Logo] - 2023-09-30

- Use the new Home Assistant logo

## [Fix] - 2023-09-10

- Notifications could not be opened from the Menubar and instead throw an error
- Fix possible crashes when commands are not enable

## [Fix] - 2023-08-15

- Updates from HACS will be shown in the menu regardless of the update entity states

## [HACS-Menu] - 2023-08-03

- Add HACS updates to menubar
- Add `Update without Backup` menu to support updates for integration which does not support backups

## [Menu] - 2023-07-25

- Add Media Player Menu Bar command
- Add Entities Menu Bar command to allow to add specific entities in the Menu Bar
- Add Lights Menu Bar command
- Add Covers Menu Bar command
- Add Batteries Menu Bar command
- Notifications menu now contains battery low battery states as well as updates

## [Modernize] - 2023-07-16

- Add support for switching assist pipelines
- Persistent Notifications can now be dismissed in the menu bar

## [Fix] - 2023-06-25

- Use nearest resolve url also for http requests

## [Fix] - 2023-06-24

- Get persistent notifications via websocket API instead of entities because since 2023.06 the entity option does not exist anymore

## [Update] - 2023-06-14

- Add home network detection to switch between an internal url and an external one
- Add `Connection Check` root command
- Add support for `.local` urls (mDNS)

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

- The properties of base temperature options for climate entities (min_temp, max_temp, and target_temp_step) are now used for the climate entity instead of a hardcoded list

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
