# macOSIcons.com Changelog

## [Fix Cloudflare Error] - 2025-11-19

- Add User-Agent header to API requests to resolve HTTP 403 Cloudflare challenge page errors
- User-Agent implementation based on patterns from other extensions (e.g.⁠instant-domain-search)

## [Enhanced Error Handling] - 2025-10-15

- Fix response body consumption bug preventing proper error messages
- Add validation for API response structure to prevent crashes
- Improve error display with full Detail view for long error messages

## [Fix API Error Handling] - 2025-07-17

- Fix error handling to check HTTP status before parsing JSON response
- Properly handle non-JSON error responses (e.g., Cloudflare HTML 403 pages)
- Improve error messages to include HTTP status codes and response body

## [User Applications] - 2025-06-04

- Adds support for applying icons to user applications (`~/Applications`).

## [Code style] - 2025-05-30

- Format code using Raycast's style rules

## [Bug fix] - 2025-04-22

Handle undefined downloads in subtitle formatting

## [Initial Version] - 2025-04-22
