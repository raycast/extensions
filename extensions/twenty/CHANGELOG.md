# Twenty Changelog

## [Fix] - 2026-07-28

- Fixed "Invalid input: expected object, received array" on newer Twenty versions, which changed the metadata API response shape
- Objects beyond the first page are no longer silently dropped — the metadata API now paginates at 60 objects by default
- Objects and fields no longer disappear when optional metadata flags are absent
- API errors now show the message returned by Twenty instead of a raw validation dump

## [Fix Bug] - 2025-11-27

- Fixed issue when adding API Key, it would not work
- Added Windows platform support

## [Field Improvements] - 2025-06-12

- Required fields simplified: Only the primary field is required
- Automatic defaults: All optional fields use predefined default values if left empty

## [Maintenance] - 2025-02-12

- Cleanup unused `.github` files

## [Enhancements] - 2025-01-09

- Added support for multi-select field type

## [Enhancements] - 2024-12-18

- Updated select field type with preference

## [Enhancements] - 2024-12-11

- Added support for rating field type

## [Enhancements] - 2024-12-04

- Updated entire twenty extension to be flexible

## [Enhancements] - 2024-11-13

- Show Loading Indicator in `List People`
- Now supports self-hosted Twenty

## [Initial Version] - 2024-10-16

- Supports Twenty.com cloud version
- Create a person in your CRM
- Create a company in your CRM
