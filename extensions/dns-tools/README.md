# DNS Tools for Raycast

Two commands for macOS and Windows:

- **Flush DNS Cache** clears the local operating system resolver cache. macOS requests administrator authorization through the system prompt. Cancelling or failing the command produces an error.
- **Check DNS Propagation** checks a selected record type from live Globalping probes across six world regions, showing each available probe's city, network, resolver, records, and TTL. **All Common Records** checks A, AAAA, CAA, CNAME, MX, NS, SOA, SRV, TXT, HTTPS, SVCB, DS, and DNSKEY through Google Public DNS and Cloudflare 1.1.1.1. It queries the exact domain entered; DNS does not provide a way to enumerate every subdomain or every possible record type.

In the results view, use **Copy Records** to copy an answer's values and TTLs, or **Copy Diagnostic Report** to copy all checked results, including the domain, check time, resolver or probe details, and errors.

## Development

Install Raycast and sign in. Install Node.js 22.22.2 or newer, as required by Raycast API 2.x, then run:

```sh
npm install
npm run dev
```

Raycast should import the extension during development. Run `npm test`, `npm run lint`, and `npm run build` before distribution. Verify the flush command on macOS and both commands on Windows before claiming Windows runtime support.

The extension is authored by the Raycast user `suryanavv`.

No Raycast AI subscription, DNS API key, or paid service is required. Globalping's anonymous API currently allows 250 free probe tests per hour and 50 probes per measurement. A selected-type check requests up to 18 probes; fewer may be available. Lookup names are sent to Globalping for geographic checks, or to Google and Cloudflare for All Common Records. Each probe uses its own configured resolver, so locations and resolver networks can vary between runs.

## Credits

Created by [Surya Naveen](https://suryanavv.in/) · [GitHub](https://github.com/suryanavv).
