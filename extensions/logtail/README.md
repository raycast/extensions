# Logtail

Search and View your Logtail logs at any time

## Getting Started

1. Copy your [Direct API Token](https://betterstack.com/docs/logs/api/getting-started/) from your Logtail Dashboard
2. Run any of the commands (or open Logtail Extension Preferences in Raycast)
3. Paste your previously copied API Token into the preferences form and submit
4. You're all set! 🎉

## Usage

### Querying Logs

This extension is almost entirely reliant on the syntax for Log Tail's [Live Tail Query Language](https://betterstack.com/docs/logs/using-logtail/live-tail-query-language/).

By default, this extension will allow you to select the [Logtail Source](https://betterstack.com/docs/logs/logging-start/#step-1-creating-a-source) to query from. If you only have one Logtail source configured, then the extension will automatically use that source.

If there are multiple sources found, then all of the sources will be displayed for you to select. From here, you can use the "Set Default" action (<kbd>Cmd</kbd> + <kbd>&#8629;</kbd>) to use this source for every query or "Remove Default" action (<kbd>Cmd</kbd> + <kbd>&#8629;</kbd>) to clear any previously set default source.

Sources can be viewed at any time through the "View Sources" action (<kbd>Cmd</kbd> + <kbd>S</kbd>) under the "Query Logs" command.

### Log Details

Log details are customizable through the `Add Metadata Tag` and `View Metadata Tags` commands. If a key name is not found in a particular log response body it will not be show in the Log Details. Since many attributes of a log are dependent on your integration with Logtail, you can inspect the full log body to view configurable options `Copy Raw Log` action when viewing a log.
