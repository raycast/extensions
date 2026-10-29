# Fastly Changelog

## [AI Extension] - 2026-09-26

The extension can now be used with Raycast AI: mention `@fastly` in AI chat or Quick AI to work with your account conversationally. Fourteen tools cover the main capability areas:

- **Services & traffic**: list services, get details (domains, versions), and 24-hour stats including cache hit ratio and bandwidth
- **Purging**: purge a URL, surrogate keys, or a whole service — every purge asks for confirmation, and soft purge is preferred by default
- **Security**: Bot Management and DDoS Protection status with 24-hour activity, recent DDoS attack events, and switching DDoS Protection between log and block modes (with confirmation)
- **TLS**: certificates and subscriptions with days-until-expiry, so the AI can flag certs expiring soon
- **Alerts & audit**: alert definitions and firing history, plus audit log queries ("what changed on my account yesterday?")
- **AI Runtime Control**: usage metrics by provider/model and virtual key listings (metadata only — access tokens are never returned)

## [AI Runtime Control, Bot Management + DDoS Protection] - 2026-09-22

New operational commands:

- **Purge Cache**: purge a URL, surrogate keys, or a whole service, with soft purge support
- **Watch Real-Time Stats**: live requests/sec, hit ratio, bandwidth, and error counts per service
- **Manage Service Add-Ons**: enable/disable products (Image Optimizer, Fanout, WebSockets, and more) per service
- **Manage TLS Certificates**: certificates and subscriptions with expiry warnings
- **View Alerts**: alert definitions and firing history
- **Version management**: activate, roll back, clone, and diff service versions from Manage Services

Added support for three more Fastly products:

- **AI Runtime Control**: Manage virtual keys (create, rotate, edit, delete — with the access token shown once on creation) including rate limits, the AI Firewall, and provider failover policies; configure AI provider connections; view usage metrics by provider, model, or virtual key (estimated spend, requests, tokens, and AI Firewall violations); and browse session logs with request/response data
- **Bot Management**: Enable or disable Bot Management per service and view detected bot traffic, including breakdowns by bot type (AI crawlers, search engine crawlers, headless browsers, and more) and challenge outcomes
- **DDoS Protection**: Enable or disable DDoS Protection per service, switch between log and block modes, view a per-service traffic overview (allowed/detected/mitigated), browse attack events, and manage mitigation rules — per event, per service, or account-wide with action filtering — adjusting rule actions in real time. Bot Management and DDoS Protection status also surface on service detail views

Fixes:

- Fixed KV Store and Secret Store pagination reading the wrong cursor field (`meta.cursor` instead of `meta.next_cursor`), which capped every listing — and JSON exports — at the first page, and added a page cap as a safety guard
- Rejected malformed CIDR prefixes with trailing characters (e.g. `10.0.0.0/8x`) or leading zeros in ACL entry and bulk-add forms, which previously passed validation and failed at the API with a confusing error

## [Fix Secret Store Operations] - 2026-07-22

- Fixed secret creation and recreation to use correct API endpoints and base64 encoding

## [New Data Stores and Security Features] - 2026-03-11

Added support for Fastly's data stores and audit logging:

- **KV Stores**: Browse, create, update, and delete key-value pairs across all stores
- **Config Stores**: Manage runtime configuration without service deployments
- **Secret Stores**: Create and rotate secrets securely with proper obfuscation
- **Access Control Lists (ACLs)**: Quick IP blocking and ACL entry management for security response
- **Audit Log**: View and filter account activity for security monitoring and compliance

These additions expand the extension beyond CDN operations to cover the full Fastly platform.

## [Windows Support + Validate Forms] - 2025-12-19

- Added Windows support
- Updated `Keyboard` shortcuts to be cross-platform
- Added form validation (forms now ensure all fields are present)
- Update many links

## [Added Fastly] - 2024-11-25

Initial version code
