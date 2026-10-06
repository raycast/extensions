# Changelog

All notable changes to the DNS Quick Change extension will be documented in this file.

## [Modernization & Asynchronous Refactoring] - {PR_MERGE_DATE}

### Added

- Fully asynchronous network execution across all system tools (`networksetup`, `scutil`, `route`, `ifconfig`, `osascript`) using `execFileAsync`, keeping the Raycast UI responsive
- Command execution timeout (8 seconds) to prevent hanging processes
- Robust fallback when the default route is a virtual VPN tunnel (`utun*`), automatically selecting active physical adapters
- Clear handling and user notification for AppleScript authorization cancellation (-128)
- Search presets by DNS server IP addresses via keyword indexing
- Modern Raycast 2.0 UI enhancements with semantic color tokens (`Color.Blue`, `Color.Orange`, `Color.Green`) and status badges
- Grouped Action Panel sections (Apply, Copy, Manage Presets, Network Controls)
- List empty view with quick actions when search queries yield no results
- Comprehensive 43-test unit test suite covering async operations, parsers, and error recovery

### Changed

- Upgraded `@raycast/api` to `^2.6.2` for Raycast 2.0 and macOS 27 compatibility
- Added `typecheck` and `test` scripts to `package.json`

## [Initial Release] - 2026-06-01

### Added

- Quick DNS preset switching with one-key activation
- Create, edit, and delete DNS presets with validation
- Preset descriptions for better organization and context
- View comprehensive network interface details (IP, subnet, router, MAC address, IPv6)
- Reset to DHCP functionality to restore automatic DNS assignment
- Built-in presets: Cloudflare (fast, privacy-focused), Quad9 (malware/phishing blocking), OpenDNS (content filtering)
- Keyboard shortcuts for all major actions (⌘E to edit, ⌘N to add, ⌃X to delete)
- Network status display showing current DNS source (DHCP or Manual)
- Real-time active DNS server detection
- Preset storage in `~/.dns_presets` with persistent configuration
- User preference for manual network service selection (auto-detects Wi-Fi, Ethernet, etc. by default)
- 4 high-quality screenshots demonstrating core features

### Security

- Re-validation of all IP addresses at runtime to prevent shell injection from manually-edited preset files
- Strict IP regex and range validation (0-255) before any shell command execution
- Validate preset names at parse-time to reject malformed or malicious names in `~/.dns_presets`
- Validate `NETWORK_SERVICE` (both user preference and auto-detected value) against a safe pattern before use in any shell command
- Validate Router IP before exposing the "Open Router in Browser" action to prevent URL/protocol injection
- Defense-in-depth approach: validation at write-time (form), parse-time (loading presets), and apply-time (execution)

### Performance

- Asynchronous network service detection deferred to `useEffect` to prevent startup blocking
- Network details loading moved to `useEffect` to prevent UI freezing when viewing details
- Module-level constants use placeholders that are updated asynchronously

### Code Quality

- Using auto-generated `Preferences` type from Raycast's `raycast-env.d.ts` for type safety
- Removed unused `@raycast/utils` dependency
- Proper Title Case for acronyms ("DNS Quick Change", "DHCP")
- Full linting and build compliance for Raycast Store
- Comprehensive error handling with user-friendly toast notifications
- Consistent acronym casing throughout UI ("DHCP" not "Dhcp")
- Added `.prettierrc` configuration for consistent code formatting (120 character line width, double quotes)
