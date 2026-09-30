# URL Unshortener Changelog

## [Maintainance] - 2025-07-14

- Updated eslint to version 9.30.1.
- Fixed new linting issues that were introduced by the update.

## [Fix] - 2025-07-10

- Undo previous changes that broke unshortening for some URLs. For example t.co links.
- Make extension available to Windows users.
- Bump dependencies.

## [Improvement] - 2025-04-09

- Fixed issue with selected text retrieval, adding clipboard fallback when frontmost application access fails

## [Improvement] - 2025-03-18

- Improved URL unshortening to better handle complex URLs like Microsoft SafeLinks
- Implemented hybrid HEAD/GET approach for optimal performance and reliability
- Added proper HTTP headers for more reliable redirects
- Added handling of relative URLs in redirects
- Added maximum redirect limit for safety
- Improved error handling to be more graceful

## [Fix] - 2023-12-12

Fixed the URL validation that didn't catch domains with 1 character

## [Initial Version] - 2023-12-01

Initial version code
