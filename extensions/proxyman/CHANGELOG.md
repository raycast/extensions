# Proxyman Changelog

## [Fix Chrome Current Profile Proxy] - 2026-11-06

- Setup Chrome Current Profile now quits every Chrome instance that uses your profile and waits until it has exited before relaunching, so the proxy flags are no longer silently dropped when Chrome was slow to quit or another Chrome instance (e.g. the New Profile one) was running
- The command now verifies that Chrome restarted with the Proxyman proxy and shows an error instead of a false success

## [Auto-Start Proxyman and Auto-Detect Proxy Port] - 2026-07-06

- Setup commands now automatically start Proxyman and wait for its proxy to be ready if it is not already running, so a configured browser no longer points to a dead proxy
- Automatically detect Proxyman's configured proxy port

## [Automatic Setup Commands] - 2026-07-01

Added Automatic Setup commands to launch pre-configured browsers and terminals with Proxyman HTTP proxy and trusted certificate:

- Setup Chrome Current Profile
- Setup Chrome New Profile
- Setup Firefox
- Setup Terminal

## [Initial Release 📣] - 2024-10-24

Introduce some common actions in Proxyman:

- Toggle System Proxy
- Toggle Map Local Tool
- Toggle Breakpoint
- Toggle Blocklist
- Toggle Allowlist
- Toggle Map Remote
- Toggle Scripting
- Toggle External Proxy
- Toggle SOCKS Proxy
- Toggle Network Condition
- Toggle SSL Proxying List
- Toggle Record Traffic
- Clear Session
