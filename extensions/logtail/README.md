# LogTail

Search and View your LogTail logs at any time

## Getting Started

1. Copy your [Direct API Token](https://betterstack.com/docs/logs/api/getting-started/) from your LogTail Dashboard
2. Open `Configure LogTail` command in RayCast
3. Paste your previously copied API Token into the form and submit
4. You're all set! 🎉

## Usage

### Querying Logs

This extension is almost entirely reliant on the syntax for Log Tail's [Live Tail Query Language](https://betterstack.com/docs/logs/using-logtail/live-tail-query-language/)

### Log Details

Log details are customizable through the `Add Metadata Tag` and `View Metadata Tags` commands. If a key name is not found in a particular log response body it will not be show in the Log Details. Since many attributes of a log are dependent on your integration with LogTail, you can inspect the full log body to view configurable options `Copy Raw Log` action when viewing a log.
