# Time Converter Changelog

## [Time Range Support & Timezone Overhaul] - 2026-04-14

### Added
- Time range input: enter `1pm - 3pm`, `1pm to 3pm`, `11pm through 1am`, or `2pm until 4pm` to convert a span of time across all locations
- Automatic overnight detection for ranges — `11pm - 1am` correctly places the end time the next day
- Day labels (e.g. Friday, Saturday) automatically appear in range output when any location spans midnight, or when the input includes an explicit date
- Expanded location coverage: now resolves ~600 IANA timezones via the built-in JS Intl API, up from ~200 hand-curated cities
- New supported inputs: region names (Eastern, Pacific, Central), country names (Japan, India, Brazil), and additional airport/short codes

### Improved
- Single unified alias file replaces six scattered regional constant files — easier to maintain and extend
- Tooltip (ⓘ) on the Time field now documents all supported keywords and range syntax
- Upgraded date-fns to v3 and date-fns-tz to v3

## [Added Time Converter] - 2025-01-05

Initial version
