# ipdata IP Lookup Changelog

## [Initial Version] - {PR_MERGE_DATE}

- **Look Up IP**: look up any IPv4 or IPv6 address or hostname. Shows the country flag, city, region and country, the operator (ASN number, name and usage type), the owner (company, falling back to the operator's organisation), coordinates with Apple Maps and Google Maps actions, local time, currency, languages and calling code. With an API key: trust score, VPN / proxy / Tor / datacenter signals and blocklists.
- Every result shows the seven enrichment rows and a vector road map of the location, drawn from ipdata's own road tiles.
- **My IP**: this machine's public IPv4 and IPv6 addresses, detected in parallel through `v4.ipdata.co` and `v6.ipdata.co`, each with its record.
- **Look Up Selected IP**: looks up the IP address selected in the frontmost app (clipboard fallback) and shows city, country and operator as a HUD; assign it a hotkey for a hover-like workflow.
- **Look Up Clipboard IP**: looks up the first IP address found in the clipboard and shows city, country and operator as a HUD.
- **IP Menu Bar**: country flag and public IPv4 in the menu bar, refreshed every 10 minutes, with the full record in the menu.
- Works without an API key on ipdata's free tier (1,000 city-level lookups a day per connection); an optional key on the global or EU endpoint unlocks the full record.
- Lookups are cached for one hour; the remaining free quota is shown in the detail pane.
