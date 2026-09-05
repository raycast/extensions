# 02 — Which geo provider enriches one IP?

Parent: [map.md](../map.md)
Type: research
Status: resolved
Blocked by: —

## Question

Which IP-geolocation provider should a Raycast extension call to turn one IP into the card's second line — flag, country, region, city, ISP/ASN?

Compare candidates on: HTTPS support on the free tier, API key requirement, rate limits, response fields (does it give region *and* city *and* ISP?), latency, accuracy on datacenter/proxy IPs, licensing/attribution demands, and ToS fitness for a publicly distributed extension.

Candidates to cover at minimum:

- `ip-api.com` — what ipcheck-ing uses (`getIPDetails.ts`), but the free tier is plain HTTP only. Confirm whether HTTPS needs a paid key, and whether a Store-distributed extension may ship a cleartext call.
- `ipapi.is`, `ipwho.is`, `ipinfo.io`, `ipapi.co`, `freeipapi.com`.
- Whatever `~/GitHub/MyIP` uses server-side for its own cards (`frontend/components/IpInfos.vue` → its `/api` handlers, `frontend/utils/transform-ip-data.js`) — including whether ipcheck.ing exposes a public endpoint we may call.

Also settle the mechanical bit: does the chosen provider return a two-letter country code we can convert to a flag emoji (the `countryCodeToFlagEmoji` trick in `getIPDetails.ts`), or do we need a mapping?

Deliver a ranked recommendation with the tradeoff that decides it, plus a sample response body per candidate.

Record findings under `## Answer`, and drop any long transcripts in `../research/02-*.md`.

## Notes carried in from 01

Not an answer — inputs the eventual answer must account for.

- **`ip.net.coffee/api/geoip/<ip>` is off-limits.** It returns exactly the card's field set (`{"country": "United States", "region": "California", "city": "San Jose", "isp": "Oracle Cloud", "country_code": "us"}`, verified 2026-07-25), but that host's `robots.txt` reads `Disallow: /api/`. It is a private API behind a public page; a distributed extension must not call it. Treat it as a field-set reference only.
- **The card's line is `country · region · city · isp`** — confirmed against that response and the reference screenshot ("United States California San Jose Oracle Cl…"). That is the shape a candidate provider must be able to fill.
- **The flag may not need this API at all.** `claude.ai/cdn-cgi/trace` already returns `loc=US`, so a country flag and country code are available from the call [01](01-claude-exit-ip-source.md) already makes. The geo provider is then only needed for region, city, and ISP — which changes the calculus if every good provider wants a key.

## Answer

**Call `https://ipwho.is/<ip>?fields=country,country_code,region,city,connection`.**
Keyless, HTTPS, all four card fields, ~0.53s, 30/30 successful probes.

Full transcripts, every response body, the robots.txt sweep, the accuracy matrix and
the MyIP/ipcheck-ing code reading: [`../research/02-geo-providers.md`](../research/02-geo-providers.md).
Everything below is measured on 2026-07-26 from a residential HK exit unless tagged
`(inferred)` or `(documented only)`.

### The tradeoff that decides it

**Richest data vs. data that always arrives.** `ipapi.is` returns strictly more —
`is_datacenter` / `is_proxy` / `is_vpn` / `is_tor`, a self-reported `location.accuracy`
grade, and `datacenter.region: "us-sanjose-1"`. It was also the only provider in the
comparison that correctly identified a known Tor exit relay. But across 21 probes,
**2 requests (~10%) never completed** — one stalled past a 20s ceiling, one past 25s,
while neighbouring requests returned in 0.6s. `elapsed_ms: 0.04` in its own body says
the server is instant, so the stall is edge/network, not query cost.

For a card that renders on a keystroke, a ~1-in-10 chance of a multi-second hang is
worse than losing fields that **are not on the card's line anyway** (`country · region
· city · isp` — no proxy verdict). ipwho.is was the tightest distribution measured:
0.510–0.593s across 30 consecutive requests, zero failures. Reliability wins.

### Ranking

| # | Provider | HTTPS free | Key | Fills all 4 | Verdict |
|---|----------|-----------|-----|-------------|---------|
| **1** | **ipwho.is** | yes | no | yes | **Recommend.** Fast, steady, `?fields=` trims to 250 bytes, ships `flag.emoji`, IPv6 at full parity, no robots.txt, "Commercial use allowed", Store precedent. |
| 2 | `api.ip.sb` | yes | no | yes | **Fallback.** Equally fast; the only provider whose values match the reference card's wording exactly. Costs a UA header and a ToS gray area. |
| 3 | `ipapi.is` | yes | no | yes+ | Richest data, cleanest errors, keyless works, Store precedent — but the ~10% stall rate rules it out as primary. |
| 4 | `ipinfo.io` (bare path) | yes | no | no `isp` | Reliable ~0.69s, but only a combined `org` field, legacy keyless path "might be discontinued", and robots disallows the `/json` URL form. |
| 5 | `freeipapi.com` | yes | no | no `isp` | Works, but got the **wrong country** on a testable IP, returns HTTP 200 + all-`null` on bad input, and robots disallows `/api/`. |
| 6 | `ip-api.com` | **no** | paid | yes | **Out.** HTTPS returns `403 {"message":"SSL unavailable for this endpoint"}` after a completed handshake. Terms: "strictly limited for a non-commercial purpose and in a non-commercial environment." |
| 7 | `ipapi.co` | yes | no | ? | **Out.** `429 RateLimited` on every attempt — no successful body obtained. Docs: free tier is "Not for production use." |

Sample bodies for #1–#7 (except #6/#7 caveats) are in the research file, §1–§8.

`ipwho.is` primary response, verbatim:

```
$ curl -sS "https://ipwho.is/155.248.192.115?fields=country,country_code,region,city,connection"
{"country":"United States","country_code":"US","region":"California","city":"San Jose","connection":{"asn":31898,"org":"Oracle Public Cloud","isp":"Oracle Corporation","domain":"oracleemaildelivery.com"}}
[HTTP 200 0.579431s]
```

Maps onto the card as `country · region · city · connection.isp` →
`United States · California · San Jose · Oracle Corporation`.

Documented, not measured: 1,000 requests/day **per client IP address**, no key, HTTPS,
commercial use allowed, "Uptime is not guaranteed" (documented only — per-IP quota not
verified, see gaps). Per-client-IP is the right shape for a distributed extension:
each user spends their own budget, so the extension has no aggregate ceiling.

### The mechanical bit: yes, a plain two-letter code

Every provider returns uppercase ISO-3166 alpha-2 (`"country_code":"US"`). The
`countryCodeToFlagEmoji` trick in `getIPDetails.ts` works unchanged, on both the geo
response and on `loc=US` from `cdn-cgi/trace`. No mapping table needed. ipwho.is
additionally ships `flag.emoji` (`"🇺🇸"`) pre-rendered — available, but the local
helper is one line and removes a dependency on the field surviving.

### Things that change assumptions on the map

1. **The robots.txt rule that killed `ip.net.coffee` also hits three candidates.**
   Measured: `ip-api.com` → `Disallow: /json/`; `ipinfo.io` → `Disallow: /*/json$`;
   `freeipapi.com` and `free.freeipapi.com` → `Disallow: /api/`. Applied mechanically,
   all three are out on the same ground.
   I do **not** think it should be applied mechanically: `ip.net.coffee/api/` is an
   *undocumented private* endpoint behind someone's web page, whereas these three
   publish the same paths as their official API with their own terms, and their
   `Disallow` lines are shaped to keep crawlers from indexing per-IP result pages, not
   to bar API clients. That is a judgment call for [05](05-geo-decision.md), not mine.
   **It does not affect the recommendation** — ipwho.is serves no robots.txt at all
   (HTTP 404 on `/robots.txt`), and `ip.sb` serves `Disallow:` (empty = allow all). The
   top two picks are clean under either reading.
2. **`getIPDetails.ts` cannot be copied onto ipwho.is as-is.** Its guard is
   `if (!response.ok) throw`. ipwho.is answers a reserved-range IP with **HTTP 200** and
   `{"success":false,"message":"Reserved range"}`. That guard passes, and the card
   renders `undefined`. The client must branch on the `success` boolean. This also
   narrows the reuse-vs-rewrite question the map lists as open: the sibling's line is
   `city, country flag` — no region, no ISP — so its shape is not reusable for this
   card regardless.
3. **Confirms and strengthens carried note 3 (the flag needs no geo call).** Beyond
   `loc=US` giving flag + country code, MyIP derives the country *name* from the code
   locally rather than trusting upstream (`transform-ip-data.js`: "derived from the code
   locally (CLDR via getCountryName) … the upstream's own string is only a fallback").
   So `country` is fully obtainable without the geo provider. Country was also
   **unanimous across all 4 providers on all 6 test IPs** — the one field nobody gets
   wrong is the one field already free. The geo call is *only* for region/city/ISP,
   which means a geo failure should degrade to a still-useful card (flag + country from
   trace) rather than an error state. That is input for [05](05-geo-decision.md).
4. **ipcheck.ing is double-locked, not merely keyed.** Beyond `IPCHECKING_API_KEY` and
   a private `IPCHECKING_API_ENDPOINT` (env-only, not in the repo), `common/guards.js`
   applies `requireReferer` globally to `/api/*`, and `referer-check.js` returns `false`
   for a missing referer — so a Node client gets `403 {"error":"What are you doing?"}`.
   Same verdict as `ip.net.coffee/api/`: field-set reference only. Settled, not open.
5. **`api.ip.sb` reproduces `ip.net.coffee`'s response value-for-value** —
   `{"country":"United States","region":"California","city":"San Jose","isp":"Oracle
   Cloud","country_code":"US"}`. Note `isp: "Oracle Cloud"`, matching the reference
   screenshot's "Oracle Cl…" exactly, where ipwho.is says "Oracle Corporation" and
   ipapi.is says "Oracle Public Cloud". Suggests the prior art proxies ip.sb or shares
   its dataset (inferred — unverifiable without calling the off-limits endpoint). If
   [07](07-card-prototype.md) wants the screenshot reproduced glyph-for-glyph, ip.sb is
   the only way there; ipwho.is gives a *correct* but differently-worded ISP.
6. **IPv6 is less scary than the map fears.** ipwho.is on `2606:4700:4700::1111`
   returned the identical field set with `type:"IPv6"` — no missing region, city or ISP,
   same ~0.57s. Note for [05](05-geo-decision.md)/map item "IPv6 and dual-stack": for
   *this* provider IPv6 costs nothing. (ipinfo.io is the exception — its robots
   `Disallow: /*:*` matches any IPv6 path.)
7. **ip.sb blocks default library User-Agents at the edge** — `403 Forbidden` from
   nginx with curl's default UA, `200` with a browser UA. Its own docs say so: "Most
   HTTP libraries send a default User-Agent that the edge blocks." If ip.sb is ever
   picked, the UA header is load-bearing, not cosmetic. `node-fetch` sends
   `node-fetch/1.0` by default (inferred — not probed), so this would bite.
8. **Store precedent exists for both top picks' *class* of choice.** `purpleair`
   ships `await fetch("https://ipwho.is/")` keyless; the `ipapi-is` extension ships
   `useFetch(\`https://api.ipapi.is?q=${ip}\`)` keyless. 15 files across the repo call
   `ip-api.com` — i.e. review demonstrably lets cleartext `http://` through. Precedent
   that it *passes*, not an argument that it *should*; ipwho.is makes the question moot.

### What I could NOT establish

- **No successful `ipapi.co` response body.** Every attempt returned `429`. I cannot
  distinguish "this exit IP already burned its daily quota" (shared/CGNAT neighbour, or
  other tooling on this machine) from "ipapi.co blocks this network". Its docs' "Not for
  production use" clause disqualifies it either way, so I did not chase it further.
- **Whether the documented 1,000/day is really per-client-IP for keyless calls** on
  ipwho.is or ipapi.is. Verifying means burning 1,000 requests against a free service;
  I did not. ipwho.is's docs say "per client IP address" — taken on trust.
- **ipwho.is's rate-limit response shape and status code.** Never triggered it. The
  client's over-quota path is therefore unverified; assume the `success:false` envelope
  (documented only).
- **Reliability beyond one session.** All timings are a single 2026-07-26 window.
  ipwho.is's own pricing page says "Uptime is not guaranteed" — 30/30 today is not an
  SLA, and the ipapi.is stalls are exactly the kind of thing a different day or vantage
  point would change.
- **Absolute latency for the extension's actual users.** Probed from HK; every
  Cloudflare-fronted provider answered from the `HKG` edge. Numbers are comparable to
  each other, not predictive for a US/EU user.
- **Accuracy against ground truth.** There is no independent truth source for where an
  IP physically is. I used cross-provider consensus plus ipapi.is's `datacenter` /
  `company` metadata as a proxy for truth. The anycast IPs (8.8.8.8, 1.1.1.1) are
  irreducibly ambiguous and prove nothing about any provider. "freeipapi got
  104.28.246.77 wrong" means "disagreed with the other three", which is strong but not
  proof.
- **Whether ipwho.is's ToS redistribution clause reaches this use.** It prohibits
  "copy, modify, resell, sublicense, or redistribute our materials or services without
  our prior written permission". I read that as aimed at reselling or mirroring the
  dataset, not at an app showing one lookup to the user who triggered it — but that is
  my reading of legal text, not a measurement, and no attribution requirement is stated
  anywhere I found.
- **Where ip.sb's "shipping a commercial product" line lands** for a free
  open-source Raycast extension. Its docs invite such users to "get in touch". Unresolved
  — part of why it is #2 and not #1.
- **Whether Raycast review objects to any specific provider or to a network call
  without a user-configurable key.** Out of scope here; that belongs to
  [03](03-store-rules-and-manifest.md).
