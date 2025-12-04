# argy-usd Changelog

## [1.0.4] - 2025-04-30

### Changed

- **Official dollar exchange added**: The official dollar exchange of Argentina was added.

## [1.0.3] - 2024-10-24

### Changed

- **Interval Logic Adjustment**: Adjusted the interval logic to ensure currency quotes are refreshed every 3 minutes, enhancing data accuracy for users.

## [1.0.2] - 2024-07-19

### Fixed

- **Abort Controller Handling**: Resolved an issue where fetch requests were being prematurely aborted, leading to frequent error messages. The Abort Controller logic has been refined to ensure that requests are only aborted when necessary.
- **Error Handling**: Improved error handling to ensure only genuine errors are reported to the user, reducing false alarms and enhancing the user experience.

### Details

- Introduced a dedicated `handleError` function for cleaner and more effective error handling.
- Improved the state management and revalidation logic to prevent unnecessary fetch aborts.
- Ensured smoother and more reliable fetching of currency data by refining the use of Abort Controllers.
- Adjusted the interval logic to ensure currency quotes are refreshed every 3 minutes, enhancing data accuracy for users.

## [Initial Version] - 2024-05-26
