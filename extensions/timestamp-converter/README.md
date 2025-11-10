# Timestamp Converter

A powerful Raycast extension for converting between Unix timestamps and datetime formats.

## Features

- **Smart Conversion**: Automatically detects whether input is a timestamp or datetime string
- **Live Current Time**: Leave input empty to view current time in all formats (updates every second)
- **Multiple Formats**: ISO 8601, full format, localized format, Unix timestamps (seconds/milliseconds), and relative time
- **Timezone Support**: Display time in multiple timezones including Local, UTC, Beijing, New York, Los Angeles, London, Tokyo, and Singapore
- **Quick Access**: Multiple keyword aliases (`timestamp`, `ts`, `time`, `unix`, etc.)
- **One-Click Copy**: Copy any format with a single action

## Usage

Type `timestamp`, `ts`, `time`, or `unix` in Raycast:

- **Current Time**: Leave input empty to see current time in all formats
- **Convert Timestamp**: Enter a 10-digit (seconds) or 13-digit (milliseconds) timestamp
  - Example: `1699622400` or `1699622400000`
- **Convert DateTime**: Enter an ISO 8601 datetime string
  - Example: `2025-11-10T14:30:45` or `2025-11-10 14:30:45`

Press `Enter` to copy the preferred format, or `Cmd+K` to choose a specific format.

## Configuration

Customize the extension in Raycast preferences:

- **Default Timezone**: Choose your preferred timezone for display
- **Show Multiple Timezones**: Toggle to show/hide both local and UTC times
- **Preferred Date Format**: Select between ISO 8601, Full Format, or Localized format

## Supported Formats

- **ISO 8601**: `2025-11-10T14:30:45+08:00`
- **Full Format**: `2025-11-10 14:30:45`
- **Localized**: Based on your system language
- **Unix Timestamp (seconds)**: `1699622400`
- **Unix Timestamp (milliseconds)**: `1699622400000`
- **Relative Time**: `2 hours ago`

## Supported Timezones

- Local Time
- UTC
- Asia/Shanghai (Beijing)
- America/New_York (EST/EDT)
- America/Los_Angeles (PST/PDT)
- Europe/London (GMT/BST)
- Asia/Tokyo
- Asia/Singapore

## License

MIT
