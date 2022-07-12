# Home Assistant Changelog

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
