# Pie for Pi-hole Changelog

## [Pi-hole v6 Support] - 2026-03-08

- Added Pi-hole v6 API support with session-based authentication and 2FA/TOTP
- Added 9 new commands: Manage Domains, Add Domain, Subscription Lists, Add List, Check Domain, Update Gravity, Restart DNS, Flush Logs, Backup Config, Groups & Clients, View Configuration
- Enhanced Dashboard with query type breakdown and system info (v6)
- Enhanced Clients & Devices with network device view (v6)
- Added optimistic UI updates for toggle and list operations
- Added group membership management for clients and domains

## [Fix] - 2023-02-14

1. Fixed both Get Summary and Toggle Pi-hole commands which broke due to auth changes to the API.
2. Added ability to copy domain address to clipboard.

## [Fix] - 2022-09-19

Fixed a bug where the extension broke due to unhandled cases.

## [Initial Version] - 2022-06-16
