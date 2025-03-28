# URL Unshortener Changelog

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
