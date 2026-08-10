# time

Work with Unix timestamps and date arithmetic.

## Inputs

- `INPUT` optional: timestamp, date/time string, or `now`.

## Options

- `--to <TO>`: output formats: `iso`, `rfc2822`, `rfc3339`, `unix`, `human`; default all.
- `--tz <TZ>`: IANA timezone, e.g. `America/New_York`.
- `--add <ADD>`: add duration, e.g. `30d`, `5h`, `90m`.
- `--sub <SUB>`: subtract duration.
- Global: `--json`, `--quiet`, `--output`.

## Output

Date/time in requested formats.
