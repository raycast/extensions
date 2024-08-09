# Week Number and Year Progress Raycast Extension

## Overview

This Raycast extension displays the current week number and the progress of the year in the menu bar. Users can
customize the display format to include the week number, date, and a progress bar represented by emojis.

## Features

- **Current Week Number**: Displays the current week number in the menu bar.
- **Year Progress**: Shows the progress of the year as a series of emojis.
- **Customizable Format**: Allows users to customize the display format using placeholders.
- **Date Formatting**: Supports custom date formats using `date-fns`.

## Configuration

### Date Formatting with `date-fns`

The extension uses the latest `date-fns` to format dates inside the display string.

Examples:

- `'Week 'ww ', 'yyyy` will display `Week 32, 2024`.
- `EE - 'Week 'ww ', 'yyyy` will display `Fri - Week 32, 2024`.

Here are some common tokens you can use:

- **yyyy**: Full year (e.g., 2024)
- **MM**: Month (01-12)
- **dd**: Day of the month (01-31)
- **EEEE**: Full name of the day of the week (e.g., Monday)
- **MMM**: Abbreviated month name (e.g., Jan)
- **ww**: ISO week of the year (01-53)

For a full list of tokens, refer to the [date-fns documentation](https://date-fns.org/v3.6.0/docs/format).

### Preferences

You can configure the extension through the Raycast preferences:

1. **Format**: Customize the display format using the placeholders mentioned above.
2. **Progress Bar**: Enable or disable the progress bar.
3. **Progress Bar Emoji**: Choose the emoji used for the progress bar.
