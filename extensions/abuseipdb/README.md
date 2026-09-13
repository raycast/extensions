# AbuseIPDB for Raycast

Check the abuse reputation of any IPv4 or IPv6 address against [AbuseIPDB](https://www.abuseipdb.com) without leaving Raycast.

## Commands

| Command | What it does |
| --- | --- |
| **Check IP** | Type or paste an IP (or pass it as an argument) and get the full report. Keeps a list of recent lookups. |
| **Check IP from Clipboard** | Grabs the first IP found in the clipboard and checks it straight away. |

## Setup

1. Create a free API key at <https://www.abuseipdb.com/account/api> (1,000 checks/day on the free plan).
2. Run any command once — Raycast asks for the key.
3. Optionally change the report window (default 90 days) and whether individual report comments are fetched.

## What you get

- Abuse confidence score with a colour-coded verdict (Clean / Low Risk / Suspicious / Malicious)
- Total reports, distinct reporters and when the IP was last reported
- Country, ISP, usage type, domain, hostnames
- Tor exit node and whitelist flags
- The latest report comments with their AbuseIPDB categories
- Copy the report as Markdown or raw JSON, or open the IP on abuseipdb.com

## Development

```bash
npm install
npm run dev
```

`npm run build` type-checks and bundles the extension; `npm run lint` runs the Raycast ESLint config.

Input is validated with Node's `net.isIP`, so hostnames and typos never reach the API. Ports (`1.2.3.4:8080`, `[2001:db8::1]:443`) are stripped automatically.

## Credits

The extension icon is the AbuseIPDB logo, from <https://www.abuseipdb.com>. AbuseIPDB is a trademark of Marathon Studios Inc.; this extension is an unofficial community client.

Licensed under MIT. BSD-2-Clause would have been my preference, but the Raycast Store requires extensions to be MIT-licensed, so MIT it is.
