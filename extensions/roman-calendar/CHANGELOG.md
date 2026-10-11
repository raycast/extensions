# Roman Calendar Changelog

## [Update Raycast API Compatibility] - {PR_MERGE_DATE}

- Require the current Raycast API package and document the Raycast 2 CLI's Node.js minimum.

## [Add Calendar Regression Tests] - {PR_MERGE_DATE}

- Add repeatable tests for leap February, the BCE/CE boundary, December 9999, and Roman date parser round trips.

## [Initial Release] - {PR_MERGE_DATE}

- Convert Gregorian dates to full and abbreviated Latin Roman dates.
- Convert full and abbreviated Roman dates back to Gregorian dates.
- Explore each day of a month with its Roman reference day and inclusive count.
- Support BCE dates without a year zero and the Roman bis sextum leap day.
- Explain the calendar rules and date syntax in the English README.
