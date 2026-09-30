# Readwise Changelog

## [Add Vitest tests and update Raycast dependencies] - {PR_MERGE_DATE}

- Add 30 Vitest tests for helpers, Readwise API requests, and browser-opening commands.
- Add commands for running tests, watching changes, generating coverage reports, and checking TypeScript types.
- Update `@raycast/api` to 2.5.3 and SWR to 2.5.1 for React 19 compatibility.
- Adapt API fetchers for SWR 2 and replace the `any` type constraint with `object`.
- Remove old React and Node type pins and document the required Node.js versions and test commands.

## [v1.0.1] - 2024-01-14

Fixes a typo

## [v1.0.0] - 2022-03-25

- Initial release with highlights and library search
