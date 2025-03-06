# E164 Formatter

A Raycast extension that formats phone numbers into the E.164 international phone number format.

## Features

- Automatically formats phone numbers to E.164 format
- Supports multiple country codes (US/Canada +1, UK +44, France +33, Germany +49)
- Defaults to US/Canada (+1) if no country code is provided
- Real-time preview of formatted number
- Copies formatted number to clipboard
- Input validation to ensure valid phone numbers

## Usage

1. Open Raycast and search for "E164 Phone Formatter"
2. Enter a phone number in any format (spaces, dashes, and other special characters will be automatically removed)
3. The formatted E.164 number will be shown in the preview
4. Press Enter or click "Format Phone Number" to copy the formatted number to your clipboard

## Examples

- Input: `(555) 123-4567` → Output: `+15551234567`
- Input: `44 20 7123 4567` → Output: `+442071234567`
- Input: `123-456-7890` → Output: `+11234567890`

## Requirements

- Raycast v1.93.1 or higher
- Valid phone number input (10-15 digits)

## Support

For bug reports or feature requests, please visit the [GitHub repository](https://github.com/kevinloo/extensions/e164-formatter).
