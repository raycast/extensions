# ipapi.is Changelog

## [Fix Crash in IpMetadata] - 2025-10-29

- Fix error when likely `location.latitude` or `location.longitude` or `location.local_time_unix` is missing or invalid (ref: [Issue #22492](https://github.com/raycast/extensions/issues/22492))

## [Enhancements + Windows Support] - 2025-10-07

- Add Windows Support
- Add "Abuse object"
- Show `Toast` on error
- Remove "_clever_" code to reduce chances of errors
- Modernize config files

## [Omit Argument to use your own IP] - 2024-10-22

- You can run a check for your own IP by leaving the `Argument` empty
- Fixed error where extension would crash if `Copy` action is run without data

## [Initial Version] - 2023-11-21
