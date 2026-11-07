# ipdata IP Lookup

Look up any IP address or hostname with [ipdata](https://ipdata.co) straight from Raycast: where it is, who operates it, who owns it, and (with an API key) whether it is a VPN, proxy, Tor exit or known threat. Also shows your own public IPv4 and IPv6 addresses and keeps your IP in the menu bar.

No account is needed: the extension uses ipdata's free service by default.

## Commands

| Command | What it does |
|---|---|
| **Look Up IP** | Type or paste an IPv4 / IPv6 address, or a hostname such as `example.com` (hostnames are resolved locally and each address is listed). The address row's pane shows the place as a heading, a vector road map drawn from ipdata's own road tiles (OpenStreetMap data) and every location attribute: region, postal code, country with the Twemoji flag, continent, EU membership, coordinates, time zone, local time, currency, languages, calling code. The selected address expands tab rows in the list: Raw JSON, Analysis (a plain-language reading of the record), Scores (trust, threat, VPN and proxy), Flags (every `is_*` flag as a red or grey pill), Blocklists (one row per list with name and category, first and last seen and days seen; the row opens the list's website), Connection (mobile, carrier, anycast, leased, satellite when present), Operator (ASN linked to bgp.tools), Owner, and View Online (Enter opens the address on ipdata.co). The command takes the address as an argument, so `Look Up IP 1.1.1.1` works from the root search, and it can be set as a fallback command. With nothing typed it shows your own addresses. |
| **Look Up Selected IP** | The desktop counterpart of the Chrome extension's hover and select triggers. Select an IP address in any app, run the command (give it a hotkey in Raycast Settings → Extensions → ipdata) and the city, country and operator appear as a HUD. With nothing selected it falls back to the clipboard. Raycast cannot react to the mouse pointer, so there is no true hover on the desktop. |
| **My IP** | Your public IPv4 and IPv6 addresses, detected in parallel through `v4.ipdata.co` and `v6.ipdata.co`, each with its full record. A family without connectivity shows "No IPv6 connectivity". |
| **Look Up Clipboard IP** | Reads the clipboard, finds the first IP address in it (also inside URLs, log lines, `host:port` and `[v6]:port` forms) and shows city, country and operator as a HUD. Copies nothing. A failure toast appears when the clipboard holds no IP. |
| **IP Menu Bar** | Country flag and public IPv4 in the menu bar, refreshed every 10 minutes. The menu lists both addresses (click to copy), location, operator, owner, coordinates, local time and trust score, plus shortcuts to look the address up in Raycast or open it on ipdata.co. |

Actions on every result: copy the address, copy the JSON exactly as ipdata returned it, show the JSON, open the address on ipdata.co, open the coordinates in Apple Maps or Google Maps, copy the location, operator or coordinates, refresh, and add or change the API key.

## Paste an address into Raycast

Enable **Look Up IP** as a fallback command (Raycast Settings → Advanced → Fallback Commands, or ⌘K on the command in the root search → Manage Fallback Commands). After that, pasting an address or hostname into Raycast's root search shows "Look Up IP" with the pasted text, and Enter looks it up. The command also accepts the address as an argument, so typing `Look Up IP`, Tab, and the address works without the fallback.

## Preferences

| Preference | Default | Notes |
|---|---|---|
| **API Key** | empty | Optional. With a key the extension calls `api.ipdata.co` and shows every field: company, carrier, VPN / proxy / Tor / datacenter / iCloud Relay flags, trust, VPN, proxy and threat scores, blocklists, currency, languages, calling code. Get a key at [dashboard.ipdata.co](https://dashboard.ipdata.co). |
| **API Endpoint** | Global | `api.ipdata.co` or `eu-api.ipdata.co` (EU data residency). Only used with a key. |

## Free tier and API key

| | Free (`ipdata.co`, fallback `ipdata.free`) | API key (`api.ipdata.co` / `eu-api.ipdata.co`) |
|---|---|---|
| Fields | ip, city, region, country, coordinates, postal code, ASN, organisation, time zone | everything, including company, carrier, threat intelligence and scores |
| Quota | 1,000 city-level lookups per day from your connection, then country-level data until the daily reset | per plan |
| Shown in the detail pane | "Free Lookups Left Today", from the `RateLimit-Remaining` header | "Requests (24h)" from the `count` field |

Lookups are cached for one hour (your own addresses for two minutes), so repeated lookups of the same address cost nothing.

## Privacy

Only the address being looked up is sent to ipdata. Private, loopback, link-local, carrier-grade NAT, multicast and documentation addresses are recognised locally and never sent anywhere. Hostnames are resolved with the system resolver. Nothing is sent to any other service.

## Development

```bash
npm install
npm run dev
```

`npm run dev` builds the extension and loads it into Raycast (Raycast 1.26 or later with [developer mode](https://developers.raycast.com/basics/getting-started) enabled). Changes are hot-reloaded; console output appears in the terminal. The menu bar command appears in Raycast's root search as "IP Menu Bar"; run it once to add the item to the menu bar and enable background refresh from its action panel.

```bash
npm run build   # type-check and bundle into Raycast's extensions folder (ray build -e dist -o dist for a local dist/)
npm run lint    # manifest schema, icons, metadata, ESLint and Prettier
npm run fix-lint
```

Layout:

| Path | Role |
|---|---|
| `src/lookup-ip.tsx` | Look Up IP command (list with detail pane; argument or search bar). |
| `src/my-ip.tsx` | My IP command. |
| `src/lookup-selected-ip.ts` | Look Up Selected IP (no-view command; selected text with clipboard fallback). |
| `src/lookup-clipboard-ip.ts` | Look Up Clipboard IP (no-view command). |
| `src/lib/quick.ts` | Shared by both no-view commands: extract, look up, show the HUD. |
| `src/menu-bar.tsx` | IP Menu Bar command (menu-bar command, `interval: 10m`). |
| `src/components/record.tsx` | Hero markdown, metadata panel, JSON view and the shared action panel. |
| `src/lib/card.ts` | Draws the pane SVG: the seven enrichment rows and the vector map. |
| `src/lib/map.ts` | Fetches and decodes ipdata's vector road tiles (`pbf`, `@mapbox/vector-tile`) into SVG paths; cached for a week. |
| `src/lib/ip.ts` | IP validation and extraction from text, reserved-range labels, hostname parsing. |
| `src/lib/ipdata.ts` | API client for the free service, `api.ipdata.co`, and the `v4` / `v6.ipdata.co` self lookups; response normalisation into one record shape. |
| `src/lib/cache.ts` | One-hour lookup cache on Raycast's `Cache`, plus the latest free-tier rate-limit headers. |
| `src/lib/present.ts` | Operator / owner derivation, threat chips, verdicts and formatters. |
| `assets/extension-icon.png` | 512 x 512 store icon (white ipdata pin on a dark tile). |
| `assets/flags/` | Twemoji flag SVGs, one per country code (`src/lib/flags.ts` lists them). |
| `metadata/` | Store screenshots (2000 x 1250 PNG). |

## Store screenshots

The Store shows up to six 2000 x 1250 PNG screenshots from `metadata/`. Raycast makes them itself:

1. Raycast Settings → Advanced → **Window Capture**: set a hotkey.
2. Run `npm run dev`, open a command (for example `Look Up IP` with `1.1.1.1`, then `My IP`, then a hostname such as `example.com`), press the hotkey, tick **Save to Metadata** and capture. Raycast writes `metadata/ipdata-1.png`, `-2.png`, … at the right size and with its standard background.
3. Keep the same background and theme for every screenshot and avoid showing your own address if you do not want it in the Store listing (use `Look Up IP` results rather than `My IP`).

`npm run lint` validates the files in `metadata/`.

## Attribution

Map data is © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, served from ipdata's own tile archive (`ipdata.co/tiles`).

Flags are [Twemoji](https://github.com/twitter/twemoji) SVGs (CC-BY 4.0), the same set the ipdata Chrome extension ships, vendored in `assets/flags/` so they render identically everywhere, including the menu bar.

## Publishing to the Raycast Store

Raycast's community store is the [raycast/extensions](https://github.com/raycast/extensions) repository; extensions are published through a pull request that Raycast staff review.

1. Fork `raycast/extensions` on GitHub and clone the fork.
2. Copy this folder into the fork as `extensions/ipdata` (without `node_modules`, `dist` and `raycast-env.d.ts`).
3. In `extensions/ipdata`, run `npm install`, then `npm run lint` and `npm run build`; both must pass.
4. `author` in `package.json` is the publishing account's handle (`jonathan_k`). To list the extension under the ipdata organisation instead, create the organisation in Raycast (Settings → Organizations) with the handle `ipdata`, then add `"owner": "ipdata"` and `"access": "public"` next to `author`; `npm run lint` checks the handle against raycast.com. `metadata/` must hold three to six 2000 x 1250 screenshots and `CHANGELOG.md` keeps the `{PR_MERGE_DATE}` placeholder (Raycast fills it in on merge).
5. Run `npm run publish`. It signs you in to Raycast if needed, validates the extension and opens a pull request against `raycast/extensions` from your fork.
6. Address review feedback on the pull request. Once merged, the extension appears in the Store within a few minutes.

Later versions: bump nothing (the Store has no version field); add a new entry at the top of `CHANGELOG.md` with `{PR_MERGE_DATE}` and open another pull request.
