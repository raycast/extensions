# IPCheck Changelog

## [Version 1.2] - 2026-08-17

- Add Windows support
- Add a Query IP command — look up the location, ISP and network behind any IPv4 or IPv6 address, straight from root search
- Add an IP details view with a map, region, city, coordinates, time zone, ISP, AS and mobile / proxy / hosting flags
- Add an IP in Menu Bar command (macOS) that keeps your external IP one glance away, with a configurable source, label style, refresh interval and an option to shorten IPv6 addresses in the label
- Align the external sources with MyIP: Cloudflare (IPv4/IPv6) and IPCheck.ing (IPv4/IPv6/DualStack)
- Show cached results instantly while fresh data loads, and cache location lookups for 24 hours
- Group the list into External and Local sections, with an address-family tag on every entry
- Show why a source is unavailable instead of listing a fake "Get IP Failed" entry
- Answer reserved and private addresses locally, without any network request
- Cap every request with a timeout so an unreachable source can no longer hang the command
- Resolve list locations over HTTPS, and send a proper User-Agent to every service
- Modernize the internals: the runtime's built-in fetch instead of node-fetch, @raycast/utils hooks, flat ESLint config

## [Version 1.1] - 2025-01-02

- Add options to choose IP sources to fetch from
- Improve code quality

## [Version 1.0] - 2024-12-16

- Initial Release
