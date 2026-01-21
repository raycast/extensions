# URL Resolver

Resolve a URL to its final destination and show the full redirect chain. Uses DNS-over-HTTPS (DoH) to resolve hostnames via your chosen provider, then follows HTTP redirects without opening a browser.

## Command

- **Resolve URL**: Paste or type a URL (auto-fills from clipboard when it looks like a URL), then press Enter.

## Features

- **Redirect chain**: Shows each hop (HTTP 3xx + `Location`) until the final URL.
- **Multiple DoH providers**: Cloudflare (1.1.1.1), Google (8.8.8.8), Quad9 (9.9.9.9), OpenDNS.
- **Helpful actions**: Open final URL, copy final URL, copy full trace; retry with a longer timeout on timeouts.

## Preferences

- **Default Resolver** - DoH provider for DNS resolution (default: Cloudflare)
- **Max Redirects** - Maximum hops to follow (default: 10)
- **Timeout** - Per-request timeout in ms (default: 3000)

## Notes

- Follows server-side redirects only (HTTP 3xx + `Location`), not JavaScript, meta refresh, or other client-side navigation.
- Makes network requests from your machine to each hop in the chain (servers and the DoH provider can see your requests).

## Use Cases

- Unshorten links (bit.ly, t.co, tinyurl, etc.)
- Preview where a link ends up before opening it
- Debug redirect chains during web development
- Bypass local DNS adblock (Pi-hole, AdGuard) by using DoH directly

## Development

- `npm install`
- `npm run dev`
