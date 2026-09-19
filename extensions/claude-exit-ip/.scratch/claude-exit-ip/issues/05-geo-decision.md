# 05 — Geo provider and failure behaviour

Parent: [map.md](../map.md)
Type: grilling
Status: resolved
Blocked by: 02

## Question

Given what [02](02-geo-provider-options.md) found, which geo provider does the extension use, and what exactly does the card's location line contain?

Decide:

- The provider, and the accepted tradeoff (HTTPS, key, rate limit, attribution).
- The field set and their order — the reference card reads `United States California San Jose Oracle Cl…`, i.e. country, region, city, ISP, truncated. Confirm that ordering, and whether ASN belongs there.
- Flag: emoji from country code, or an asset?
- What renders when the IP resolves but geo lookup fails or is rate-limited — IP alone, or an error line? Geo failure is not IP failure and shouldn't be shown as one.
- Whether the user can pick a provider (preference) or it's fixed. Default: fixed, no preference, until something forces otherwise.

## Notes carried in from 02 (and graduated fog)

- **Recommended: `https://ipwho.is/<ip>?fields=country,country_code,region,city,connection`.** Keyless, HTTPS, ~0.55s, 30/30 probes clean. Maps to the card as `country · region · city · connection.isp`.
- **Geo failure must degrade, not error.** `cdn-cgi/trace` already returns `loc=US`, and country was unanimous across all four providers on all six test IPs — the one field nobody gets wrong is the one field that is already free. So a failed or rate-limited geo call should still render flag + country from the trace response. Decide that shape here.
- **The sibling's client cannot be copied.** `getIPDetails.ts` guards on `if (!response.ok) throw`, but ipwho.is answers a reserved-range IP with **HTTP 200** and `{"success":false,"message":"Reserved range"}` — that guard passes and the card renders `undefined`. The client must branch on the `success` boolean. Its display shape (`city, country flag`) is wrong for this card anyway.
- **IPv6 is a normal case, not an edge** (graduated from the map's fog). ipwho.is on `2606:4700:4700::1111` returned the identical field set with `type:"IPv6"`, same latency, nothing missing. Confirm no special handling is specified beyond what the happy path already does.
- **A robots.txt judgment call is yours.** `ip-api.com`, `ipinfo.io`, and `freeipapi.com` all `Disallow` their own API paths. The research argues those lines target crawlers indexing per-IP result pages, unlike `ip.net.coffee/api/` which is an undocumented private endpoint — but it explicitly left the call here. Moot for the recommendation: ipwho.is serves no robots.txt, ip.sb allows all.
- **Unverified, per the research:** ipwho.is's over-quota response shape and status code were never triggered, the documented 1,000/day-per-client-IP was taken on trust, and all timings come from a single HK vantage point. If the spec needs a defined over-quota path, that is an assumption to state, not a measurement.

## Answer

**Provider: `ipwho.is`, fixed in code.** Request shape:

```
GET https://ipwho.is/<ip>?fields=country,country_code,city,connection
```

Keyless, HTTPS, bare fetch — no custom User-Agent, unlike `api.ip.sb`. No fallback provider, for the same reason 04 rejected a fallback host: a second provider is a second field mapping, a second failure taxonomy, and a second set of terms to honour, for a line that already degrades gracefully. `api.ip.sb` stays documented in 02 as prior art, not as a shipped path.

**The client branches on the `success` boolean, never on `response.ok`.** ipwho.is answers a reserved-range or invalid IP with HTTP 200 and `{"success":false,"message":"…"}`. The sibling's `getIPDetails.ts` guards with `if (!response.ok) throw`, which that response passes — it would render `undefined` into the card. This is the single most important line to carry into the spec.

**Location line: country · city · `connection.isp`.**

```
🇺🇸  United States · San Jose · Oracle Corporation
```

- **Region dropped** — redundant with city for anyone who knows the country, it was where 02's cross-provider variance showed up, and dropping it buys room so the ISP survives truncation in a narrow row. This diverges deliberately from the reference card, which shows region.
- **ASN dropped from display**, though still fetched: `connection` is one bundle, so `asn` arrives free and is available to 09 as a Copy action. It is the same fact as the ISP in a form a human cannot read, and it would sit exactly where truncation bites.
- **`connection.isp`, not `connection.org`** — the operator as a person recognises it (the name on the broadband bill). The two disagree on cloud egress: `isp` gives "Oracle Corporation", `org` gives "Oracle Public Cloud". They are identical on Cloudflare.
- If `isp` comes back empty the segment is **omitted**, no `Unknown` placeholder. No fallback to `org`.

**Flag: computed locally from a two-letter code**, the regional-indicator arithmetic the sibling already uses (`getIPDetails.ts:4-5`, `String.fromCodePoint(127397 + …)`). Pure, offline, no asset, and `flag` is not requested from the API even though ipwho.is offers `flag.emoji`. Decisive reason: the degraded path must render a flag from the trace's `loc=US`, so a local code→emoji function is required regardless — taking the provider's would mean two sources feeding one slot.

**Geo failure degrades, it does not error.** One degraded state covers every cause: network error, timeout, non-2xx, and `success:false`. The documented 1,000/day-per-client-IP cap therefore needs no rule of its own — over-quota is just another geo failure, which disposes of the fact that 02 never triggered it and never saw its status code.

```
geo OK    🇺🇸  United States · San Jose · Oracle Corporation
geo fail  🇺🇸  United States — <partial marker, wording is 09's>
```

Flag and country come from the trace response's own `loc=`, which 01 established arrives free with the IP. The line is **explicitly marked as partial** rather than merely shorter: an unmarked degrade is indistinguishable from a legitimately sparse result, so a rate-limited card would look identical to a correct one. This is 04's principle applied to geo — the card states only what it can prove, and says so when it knows less than usual. Exact wording belongs to 09, including whether it distinguishes rate-limited from unreachable.

Country name from the code via **`Intl.DisplayNames`** — built into Node, zero dependency, verified locally to handle `US`, `HK`, `XK` (Kosovo) and `EU` (European Union). No country map ships. Accepted cosmetic wrinkle: its wording can differ from the provider's, so `HK` degrades to "Hong Kong SAR China" where the healthy line reads "Hong Kong".

**Timing: progressive render, geo on its own 5s budget.** The two calls are serial by necessity — geo needs the IP the trace returns — but the card does not wait for both:

```
t=0.0s  fetch claude.ai/cdn-cgi/trace    (5s budget, from 04)
t≈0.4s  IP renders; location line in a loading state
t≈0.4s  fetch ipwho.is/<ip>              (5s budget, AbortSignal.timeout)
t≈1.0s  location line fills, or degrades
```

The trace answers the question the extension exists to answer, so it paints the moment it lands; geo can take its time without the user waiting on it. Worst case: IP visible at 5s, location settled by 10s. Ticket 07 owns what the loading line looks like; this fixes the data flow underneath it.

**No provider preference.** No `preferences` entry in the manifest. A dropdown would ask the user a question they have no basis to answer, and shipping `ip.sb` as a visible option would adopt both problems that disqualified it as primary — the custom-User-Agent requirement and the contact-for-commercial-use clause.

### Recorded, not decided

- **IPv6 needs no special handling.** 02 measured `2606:4700:4700::1111` returning an identical field set at the same latency with `type:"IPv6"`. It is a normal case; the happy path covers it, and nothing extra goes in the spec.
- **The robots.txt judgment call is moot.** 02 deferred to this ticket whether `Disallow`ed API paths bind a per-IP lookup tool. ipwho.is serves no robots.txt at all, so the question never arises for the shipped provider. Unresolved in general, unresolved on purpose — it returns only if the provider changes.
