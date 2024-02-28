# Messages 2FA Changelog

## [Update] - 2024-02-20

- Add temporal unit options for searching iMessage for 2FA codes

## [Update] - 2023-12-13

- Resolves an issue where only "read" messages are shown when `ignoreRead` option is disabled

## [Update] - 2023-11-14

- Add option to ignore messages that have been read

## [Update] - 2023-09-23

- Resolves an issue where text codes would not be detected if their pattern resembled a phone number shortcode

## [Update] - 2023-09-11

- Resolves an issue where whitespace (both missing or additional) could prevent code detection

## [Update] - 2023-08-31

- Resolves an issue where "2FA" is identified as the code

## [Update] - 2023-08-18

- Adds support for uppercase alphanumberic 2FA codes between 3 and 8 characters

## [Update] - 2023-08-11

- Resolves an issue where phone numbers get extracted instead of the actual two-factor code.

## [Update] - 2023-04-13

- Resolves [iMessage 2FA] support code format 123-456 #5523 by making the check case-insensitive
- Modified the logic to no longer use if/else. This is because sometimes we identify a match and only capture part of the code.

## [Update] - 2023-01-16

- Add polling of 2FA codes

## [Update] - 2022-10-24

- Add paste code as default action for 2FA.
- Add support for Douyin 2FA.

## [Initial Version] - 2022-10-14
