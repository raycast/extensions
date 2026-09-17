# Changelog

All notable changes to the DNS Quick Change extension will be documented in this file.

## [Initial Release] - 2026-06-23

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
