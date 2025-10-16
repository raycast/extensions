# Logtail Changelog

## [Fix Crash] - 2023-11-08

- Filter logs that don't have a message body
- Coalesce nullable string on ansi strip as a fallback

## [Initial Version] - 2023-05-23

- Added Query Logs Command
  - Allow saving query for future use
  - Allow copying host and message fields
  - Allow copying raw log body
  - Allow querying for other occurrences of the selected message
  - Allow viewing sources
  - Allow automatically using a source for query if only one source is found
  - Allow setting/removing the default source to use for future queries
- Added View Saved Queries Command
  - Allow removing saved queries
- Added Set Default Source to query logs from
  - Allow removing the default source
- Added Add Metadata Command
  - Allow adding a metadata item to grab from the log
- Added View Metadata Tags Command
  - Allow removing a metadata tag
  - Allow editing an existing metadata tag
