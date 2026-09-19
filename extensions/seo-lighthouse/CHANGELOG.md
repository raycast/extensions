# SEO Lighthouse Changelog

## [Scorecard Dashboard] - 2026-09-19

- Added a Speedtest-style SVG scorecard with category gauges and Core Web Vitals
- Added copy/save scorecard image actions on macOS
- Dropped unused Lighthouse/chrome-launcher libraries — the extension uses the CLI
- Removed custom i18n (Raycast Store is English-only)
- Switched Lighthouse invocation from `exec` to `execFile`
- Removed the `--disable-web-security` Chrome flag
- Added a 24h cache in the extension support folder, expired-cache cleanup, and temp-file cleanup on error
- Saved readable JSON reports to the Output Path (`lighthouse-<host>-<timestamp>.json`) instead of hashed cache files
- Restored the Choose Output Directory action on the form
- Added Chrome-missing detection with install instructions
- Added report profiles (General, Marketing, SEO, Development) and a searchable audit explorer
- Exposed an `audit-page` AI tool for programmatic website audits
- Updated to `@raycast/api` 2, `@raycast/utils` 2, and ESLint 10 with flat config

## [1.1.0 - Update] - 2024-01-21

- Improved Lighthouse path finding mechanism
- Added support for multiple Lighthouse installation locations
- Enhanced error handling and removed unnecessary error messages
- Fixed local and global Lighthouse CLI detection
- Updated dependencies to latest versions

## [1.0.0 - Initial Release] - 2024-11-26

- Initial version of SEO Lighthouse
- Support for comprehensive SEO and performance audits
- Device type selection (mobile/desktop)
- Custom output path selection
- Analysis categories selection (Performance, Accessibility, Best Practices, SEO)
