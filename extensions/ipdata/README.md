# ipdata IP Lookup

Look up any IP address or hostname with [ipdata](https://ipdata.co) from Raycast: where it is, who operates and owns it, and, with an API key, whether it is a VPN, proxy, Tor exit or known threat. It also shows your own public IPv4 and IPv6 addresses and can keep your IP in the menu bar.

No account is needed: without an API key, the extension uses ipdata's free service.

## Commands

| Command                  | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Look Up IP**           | Type or paste an IPv4 or IPv6 address, or a hostname such as `example.com`; a hostname lists each address it resolves to. The address shows the place, a street map and the location details: region, postal code, country, continent, EU membership, coordinates, time zone, local time, currency, languages and calling code. Under the selected address, tabs show the Raw JSON, an Analysis in plain language, Scores, Flags, Blocklists, Connection details, the Operator (with the ASN linked to bgp.tools) and the Owner; View Online opens the address on ipdata.co. With nothing typed, the command shows your own addresses. |
| **Look Up Selected IP**  | Looks up the IP address selected in any app and shows city, country and operator in a HUD. With nothing selected, it uses the clipboard. Give it a hotkey for a quick lookup from anywhere.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Look Up Clipboard IP** | Finds the first IP address in the clipboard, also inside URLs, log lines and `host:port` forms, and shows city, country and operator in a HUD.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **My IP**                | Your public IPv4 and IPv6 addresses with their details. A missing address family shows as "No IPv6 connectivity".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **IP Menu Bar**          | Your country flag and public IP address in the menu bar, with the last part hidden by default, refreshed every 10 minutes. The menu lists your full addresses and their details.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Actions on a result: copy the address, open the coordinates in Apple Maps or Google Maps, show or copy the JSON, copy the location, operator or coordinates, refresh, set the API key, and view the address on ipdata.co.

To look up anything you paste into Raycast's search, add **Look Up IP** to your fallback commands. You can also type `Look Up IP`, press Tab and enter the address.

## Preferences

| Preference         | Default         | Notes                                                                                                                                                                                                                          |
| ------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **API Key**        | empty           | Optional. Unlocks the full record: company, carrier, VPN, proxy, Tor, datacenter and iCloud Relay flags, trust, threat, VPN and proxy scores, and blocklists. Get a key at [dashboard.ipdata.co](https://dashboard.ipdata.co). |
| **API Endpoint**   | Global          | `api.ipdata.co`, or `eu-api.ipdata.co` for EU data residency. Used with an API key.                                                                                                                                            |
| **Menu Bar Label** | Partial Address | IP Menu Bar only. What appears next to the flag: the partial address, the full address, "My IP", or nothing.                                                                                                                   |

## Menu bar

By default the IP Menu Bar hides the last part of your address, such as `203.0.113.x`, so your full address isn't on screen when you share or record it. An IPv6 address keeps only its first three groups, the /48 prefix, such as `2001:db8:85a3:x:x:x:x:x`. The menu always lists the full addresses.

On a MacBook with a notch, macOS adds new menu bar items at the left end and hides any that don't fit to the right of the notch. If the flag doesn't appear, set Menu Bar Label to Flag Only or remove other menu bar items. Once it's visible, hold ⌘ and drag it to where you want it. Menu bar managers such as Hidden Bar, Bartender and Ice may also place it in their hidden section.

## Free tier and API key

- **Without a key**: city, region, country, coordinates, postal code, ASN, organization and time zone. ipdata allows 1,000 city-level lookups a day per connection, then returns country-level data until the daily reset.
- **With a key**: the full record. Analysis, Scores, Flags and Blocklists need a key.

Lookups are cached for an hour, and your own addresses for two minutes.

## Privacy

Only the address being looked up is sent to ipdata. Private, loopback, link-local, carrier-grade NAT, multicast and documentation addresses are recognized on your Mac and never sent. Hostnames are resolved by your Mac's resolver. The street map is drawn from map tiles served by ipdata.co.

## Attribution

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. Flags are [Twemoji](https://github.com/twitter/twemoji) (CC-BY 4.0).
