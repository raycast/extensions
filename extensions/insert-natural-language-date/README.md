# Insert Natural Language Date

Convert a natural language prompt into a date and inserts it.

The command accepts two arguments:

1. Date Prompt: the natural language prompt (e.g. `last Friday`, `in 5 days`). If left blank, defaults to `today`.
2. Date Format: the format used for the date. If left blank, defaults to the default date format configured for the extension (which itself defaults to `YYYY-MM-DD`). [dayjs formats](https://day.js.org/docs/en/display/format) are supported.

The extension uses [Chrono](https://github.com/wanasit/chrono) as a parser. Chrono is quite good at parsing simple prompts but may produce unexpected output or fail entirely on more complex ones, e.g. `two Sundays from yesterday`.

The extension currently only handles international English prompts.
