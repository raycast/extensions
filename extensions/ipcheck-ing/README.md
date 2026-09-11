# IPCheck

All your IPs at a glance — every local interface and every external vantage point, each with the place and network behind it.

## Commands

- **Show My IPs** — every local and external IP in one list, grouped by kind, with city, country and flag. Press `↵` on any IP for its full record, or `⌘F` to look up a different address. Sources that fail are listed separately with the actual reason, not a fake entry.
- **Query IP** — the full picture behind any address: location on a map, coordinates, time zone, ISP, AS, and whether it belongs to a mobile network, a proxy or a hosting provider. Takes the IP as an argument, so `Query IP 1.1.1.1` works straight from root search.
- **IP in Menu Bar** — your current external IP and its country flag, always one glance away. Pick the source, the label style and how often it refreshes (5–60 minutes); IPv6 addresses can be shortened to their first two segments so the label stays narrow. macOS only, since Raycast has no menu bar on Windows.

## Sources

External IPs come from Cloudflare (IPv4 and IPv6) and IPCheck.ing (IPv4, IPv6 and DualStack — the dual-stack endpoint reveals which protocol your network prefers), the same sources [MyIP](https://github.com/jason5ng32/MyIP) uses. Every source can be turned on or off in the extension preferences.

City labels on the list come from ipwho.is over HTTPS. The full IP record in the detail view comes from ip-api.com. The menu bar uses neither: the country comes from the source's own `cdn-cgi/trace` response, so a background refresh every few minutes never spends a lookup. Lookups are cached for 24 hours, and reserved addresses are recognized locally — they never leave your machine.

For speed tests, DNS leak tests, WebRTC detection and more, see [IPCheck.ing](https://ipcheck.ing).
