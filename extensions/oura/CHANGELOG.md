# Oura Changelog

## [1.1.0] - 2024-11-13
- Added Oura Stress command: Get the last two week's resilience and contributing factors.
- Added Oura Resilience command: Get the last two week's stress data: stress high, recovery high, and day summary.
- Updated typo in `minutedFormatted()` function to `minutesFormatted()`
- Changed the `today()` command to `getDate(offset: number)`. Removed the `tomorrow()` function in favor of `getDate(1)`

## [1.0.1] - 2024-02-26
- Added in Actions in the "Get Oura Personal Info" command to change preferences for weight and height between Metric and Imperial.
- Added in checks in the Summary command to show "N/A" if data isn't ready from Oura. This can happen if you check first thing in the morning before your ring has synced, or if you check just after midnight before data has been sent.
- Fixed typo in README that some users were running into when they were unauthenticated with Oura on the Web.
- Adding in missing types for Preferences 

## [Initial Version] - 2024-01-20