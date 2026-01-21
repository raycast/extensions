# URL Resolver Changelog

## [2.1.0] - {PR_MERGE_DATE}

### Changed
- Renamed extension from "Cloudflare DNS Resolver" to "URL Resolver"
- Multi-provider DNS support: Choose between Cloudflare, Google, Quad9, or OpenDNS

### Added
- DNS provider preference setting
- Support for Google DNS-over-HTTPS (8.8.8.8)
- Support for Quad9 DNS-over-HTTPS (9.9.9.9)
- Support for OpenDNS-over-HTTPS

## [2.0.0] - 2025-12-13

### Changed
- Renamed extension from "Redirect Trace" to "Cloudflare DNS Resolver"
- Complete rewrite using Cloudflare DNS-over-HTTPS (DoH) for URL resolution
- Simplified UI: Form input -> Detail results with navigation
- New Cloudflare icon

### Added
- DNS resolution via Cloudflare DoH to bypass DNS blocks
- Auto-fill URL from clipboard on launch
- SNI support for HTTPS requests via IP addresses

### Removed
- Tracking parameter removal feature
- Intermediate redirect step tracking
- Redirect count display

## [1.0.0] - 2025-06-24

### Added
- Initial release of Redirect Trace extension
- Basic URL redirect tracing functionality
- HTTP status code analysis
- Redirect chain visualization
- Clipboard integration
- Tracking parameter removal
