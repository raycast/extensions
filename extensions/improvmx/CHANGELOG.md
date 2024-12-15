# ImprovMX Changelog

## [Download or Filter Domain Log] - 2024-09-20

### Enhancements

- Filter Domain Log events by status
- Download .eml

## [View Domain Logs + `chore` + `fix`] - 2024-07-03

### Enhancements

- Domains are now paginated
- View Domain Logs for domains

### Fixes

- [Issue # 12812](https://github.com/raycast/extensions/issues/12812)
- [Issue # 12813](https://github.com/raycast/extensions/issues/12813)
- [Issue # 12817](https://github.com/raycast/extensions/issues/12817)

### Dev Notes

- `useImprovMX` hook to fetch data
- `useImprovMXPaginated` hook to fetch data w/ pagination
- `parseImprovMXResponse` util function is the major shared function
- `fetchAccount` has been removed due to the following:

    1. If user changes their plan and/or email, the change is not reflected if we use the value from LocalStorage
    2. [ImprovMX API Limits](https://help.improvmx.com/getting-started/improvmx-api-rate-limits) are sufficient that we can just get the updated account

## [Security Fixes] - 2023-10-31

Fixed SMTP credentials to be generated using a cryptographically secure random number generator.

## [Fixes and Copy] - 2023-03-29

- Fixed a a bug where the extension show warning errors when trying to create a masked email address without a prop domain
- Update README.md

## [Initialized ImprovMX Raycast Extension] - 2023-02-27

Initial release of ImprovMX Raycast Extension
