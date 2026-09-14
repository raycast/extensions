# SEO Lighthouse Changelog

## [Scorecard Dashboard] - {PR_MERGE_DATE}

- Added a Speedtest-style SVG scorecard with category gauges and Core Web Vitals
- Added copy/save scorecard image actions on macOS
- Dropped unused Lighthouse/chrome-launcher libraries — the extension uses the CLI
- Removed custom i18n (Raycast Store is English-only)
- Switched Lighthouse invocation from `exec` to `execFile`
- Removed the `--disable-web-security` Chrome flag
- Added a 24h cache TTL, expired-cache cleanup, and temp-file cleanup on error
- Added Chrome-missing detection with install instructions
- Exposed an `audit-page` AI tool for programmatic website audits

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
