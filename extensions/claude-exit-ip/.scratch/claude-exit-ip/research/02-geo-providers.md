# 02 — Geo provider probe transcripts

Ticket: [issues/02-geo-provider-options.md](../issues/02-geo-provider-options.md)
Probed: 2026-07-26, from a residential HK exit (`cf-ray: …-HKG` on Cloudflare-fronted
providers — so every latency number below carries an Asia→provider-edge RTT that a
US/EU user would not pay; treat latencies as *relative*, not absolute).
Probe IP throughout: `155.248.192.115` (Oracle Cloud, us-sanjose-1).

All command output below is pasted verbatim. Anything not backed by output here is
tagged `(inferred)` or `(documented only)` in the ticket answer.

---

## 1. ip-api.com — HTTPS refusal is real

```
$ curl -sS -w '\n[HTTP %{http_code} | total %{time_total}s]\n' https://ip-api.com/json/155.248.192.115
{"status":"fail","message":"SSL unavailable for this endpoint, order a key at https://members.ip-api.com/"}
[HTTP 403 | total 0.783996s | ssl 0.630698s]

$ curl -sS -w '\n[HTTP %{http_code} | total %{time_total}s]\n' http://ip-api.com/json/155.248.192.115
{"status":"success","country":"United States","countryCode":"US","region":"CA","regionName":"California","city":"San Jose","zip":"95119","lat":37.2329,"lon":-121.7875,"timezone":"America/Los_Angeles","isp":"Oracle Corporation","org":"Oracle Cloud Infrastructure (us-sanjose-1)","as":"AS31898 Oracle Corporation","query":"155.248.192.115"}
[HTTP 200 | total 0.435276s | ssl 0.000000s]
```

Measured: the TLS handshake *completes* (ssl 0.63s) and the server then answers 403
with an explicit upsell. So it is not a cert problem — the free tier deliberately
refuses HTTPS. Confirms the ticket's premise.

Field quality is the best of the whole field: `isp` ("Oracle Corporation") *and*
`org` ("Oracle Cloud Infrastructure (us-sanjose-1)") *and* `as`.

Legal (WebFetch of <https://ip-api.com/docs/legal>):

> "The use of the API is strictly limited for a non-commercial purpose and in a
> non-commercial environment."
> "If you exceed the usage limit of 45 requests per minute your access to the API
> will be temporarily blocked."

## 2. ipwho.is — full fields, HTTPS, keyless

```
$ curl -sS -w '\n[HTTP %{http_code} | total %{time_total}s]\n' https://ipwho.is/155.248.192.115
{"ip":"155.248.192.115","success":true,"type":"IPv4","continent":"North America","continent_code":"NA","country":"United States","country_code":"US","region":"California","region_code":"CA","city":"San Jose","latitude":37.3393924,"longitude":-121.8949648,"is_eu":false,"postal":"95110","calling_code":"1","capital":"Washington D.C.","borders":"CA,MX","flag":{"img":"https://cdn.ipwhois.io/flags/us.svg","emoji":"🇺🇸","emoji_unicode":"U+1F1FA U+1F1F8"},"connection":{"asn":31898,"org":"Oracle Public Cloud","isp":"Oracle Corporation","domain":"oracleemaildelivery.com"},"timezone":{"id":"America/Los_Angeles","abbr":"PDT","is_dst":true,"offset":-25200,"utc":"-07:00"},"readme":"https://ipwhois.io/docs"}
[HTTP 200 | total 0.578833s]
```

### `?fields=` trimming works (undocumented on the page I fetched, but measured)

```
$ curl -sS -A 'claude-exit-ip-raycast/1.0' "https://ipwho.is/155.248.192.115?fields=country,region,city,connection,country_code,flag"
{"country":"United States","country_code":"US","region":"California","city":"San Jose","flag":{"img":"https://cdn.ipwhois.io/flags/us.svg","emoji":"🇺🇸","emoji_unicode":"U+1F1FA U+1F1F8"},"connection":{"asn":31898,"org":"Oracle Public Cloud","isp":"Oracle Corporation","domain":"oracleemaildelivery.com"}}
[HTTP 200 0.579431s]
```

That is exactly the card's field set in one 250-byte response.

### No UA gate

Works with curl's default UA, with a custom UA, and with an explicitly empty UA:

```
$ curl -sS -H 'User-Agent:' https://ipwho.is/155.248.192.115
{"ip":"155.248.192.115","success":true,...}
[HTTP 200]
```

### `?lang=` works (out of scope — UI is English-only — but it exists)

```
$ curl -sS "https://ipwho.is/155.248.192.115?lang=zh-CN"
{"ip":"155.248.192.115","success":true,"type":"IPv4","continent":"北美",...,"country":"美国",...,"region":"加利福尼亚州",...,"city":"聖荷西",...}
[HTTP 200]
```

### IPv6

```
$ curl -sS https://ipwho.is/2606:4700:4700::1111
{"ip":"2606:4700:4700::1111","success":true,"type":"IPv6","continent":"North America","continent_code":"NA","country":"United States","country_code":"US","region":"California","region_code":"CA","city":"San Francisco","latitude":37.7749113,"longitude":-122.4185412,"is_eu":false,"postal":"94102","calling_code":"1","capital":"Washington D.C.","borders":"CA,MX","flag":{"img":"https://cdn.ipwhois.io/flags/us.svg","emoji":"🇺🇸","emoji_unicode":"U+1F1FA U+1F1F8"},"connection":{"asn":13335,"org":"Cloudflare, Inc.","isp":"Cloudflare, Inc.","domain":"cloudflare.com"},"timezone":{...}}
[HTTP 200 | total 0.572098s]
```

Same shape, same fields, `type:"IPv6"`. No degradation.

### Error shapes — 200 with `success:false` is the trap

```
$ curl -sS -w '\n[HTTP %{http_code}]\n' https://ipwho.is/notanip
{"success":false,"message":"404 not found"}
[HTTP 404]

$ curl -sS -w '\n[HTTP %{http_code}]\n' https://ipwho.is/192.168.1.1
{"ip":"192.168.1.1","success":false,"message":"Reserved range"}
[HTTP 200]
```

A reserved/bogon IP returns **HTTP 200** with `success:false`. `response.ok` is not a
sufficient check; the client must read `success`. The documented rate-limit response
is the same shape (documented only — not reproduced, see gaps).

### No rate-limit headers

```
$ curl -sS -D - -o /dev/null https://ipwho.is/155.248.192.115
HTTP/2 200
date: Sun, 26 Jul 2026 13:05:36 GMT
content-type: application/json; charset=utf-8
content-length: 707
access-control-allow-origin: *
cf-cache-status: BYPASS
server: cloudflare
cf-ray: a2139debfc177d6c-HKG
alt-svc: h3=":443"; ma=86400
```

No `X-RateLimit-*`. The client cannot see remaining quota; it only learns it is over
by getting a `success:false`. `HEAD` returns 405 (GET only).

### robots.txt — nothing to disallow

```
$ curl -sS -L -w '\n[HTTP %{http_code}]\n' https://ipwho.is/robots.txt
{"success":false,"message":"404 not found"}
[HTTP 404]
```

The host has no robots.txt at all — the path falls through to the API's 404 handler.

### Docs / terms (WebFetch)

<https://ipwhois.io/documentation>:
> "The Free endpoint is limited to `1,000 requests per day` per client IP address."
> "No API key required"
> "HTTPS is also supported. Use https:// when you need an encrypted connection"

<https://ipwhois.io/pricing> free plan, verbatim feature list:
> "1,000 requests / day" · "Commercial use allowed" · "Native localization" ·
> "Dashboard & Currency Data" · "Uptime is not guaranteed"

<https://ipwhois.io/terms> — no attribution requirement found. Does contain a generic
redistribution clause: prohibits "copy, modify, resell, sublicense, or redistribute
our materials or services without our prior written permission" and making materials
"available on other servers or platforms without our prior written permission". Read
as aimed at reselling/mirroring the dataset, not at an app displaying one lookup to
the user who triggered it — but it is a clause a reviewer could point at, so it is
recorded here rather than waved away.

## 3. ipapi.is — richest data, keyless works, tail latency is the problem

```
$ curl -sS 'https://api.ipapi.is/?q=155.248.192.115'
{
  "ip": "155.248.192.115",
  "rir": "ARIN",
  "is_bogon": false,
  "is_mobile": false,
  "is_satellite": false,
  "is_crawler": false,
  "is_datacenter": true,
  "is_tor": false,
  "is_proxy": false,
  "is_vpn": false,
  "is_abuser": false,
  "datacenter": { "datacenter": "Oracle Cloud", "region": "us-sanjose-1", "network": "155.248.192.0/20" },
  "company": { "name": "Oracle Public Cloud", "abuser_score": "0.0045 (Low)", "domain": "oracle.com", "type": "hosting", "network": "155.248.0.0 - 155.248.255.255", "netname": "OC-260" },
  "abuse": { "name": "Oracle Public Cloud", "address": "1501 4th Ave #1800, Seattle, WA, 98101, US", "email": "domain-contact_ww_grp@oracle.com", "phone": "+1-512-712-7403" },
  "asn": { "asn": 31898, "abuser_score": "0.0064 (Low)", "route": "155.248.192.0/20", "descr": "ORACLE-BMC-31898 - Oracle Corporation, US", "country": "us", "active": true, "org": "Oracle Corporation", "domain": "oracle.com", "abuse": "network-contact_ww_grp@oracle.com", "type": "hosting", "created": "2011-03-21", "updated": "2017-05-18", "rir": "ARIN" },
  "location": { "is_eu_member": false, "calling_code": "1", "currency_code": "USD", "continent": "NA", "country": "United States", "country_code": "US", "state": "California", "city": "San Jose", "latitude": 37.33939, "longitude": -121.89496, "zip": "95196", "timezone": "America/Los_Angeles", "local_time": "2026-07-26T05:59:36-07:00", "local_time_unix": 1785070776, "is_dst": true, "utcoffset": "-07:00", "accuracy": "MEDIUM" },
  "elapsed_ms": 0.04
}
[HTTP 200 | total 0.576179s]
```

Note `datacenter.datacenter: "Oracle Cloud"` — the exact string ip.net.coffee's card
shows as `isp`, and `datacenter.region: "us-sanjose-1"`. Also `location.accuracy` as a
self-reported confidence grade, which nothing else offers. `is_datacenter` /
`is_proxy` / `is_vpn` / `is_tor` are the only proxy signals in the whole comparison.

Error shapes:

```
$ curl -sS -w '\n[HTTP %{http_code}]\n' 'https://api.ipapi.is/?q=notanip'
{ "error": "Invalid IP Address or AS Number", "error_code": "ERR_INVALID_IP_OR_ASN", "elapsed_ms": 0.01 }
[HTTP 400]

$ curl -sS 'https://api.ipapi.is/?q=192.168.1.1'
{ "ip": "192.168.1.1", "rir": null, "is_bogon": true, ... }
```

Proper 400 on bad input, `is_bogon` on private ranges. Cleanest error contract of the
group.

robots.txt: `Cannot GET /robots.txt`, HTTP 404 — none served, nothing disallowed.

### Latency: 2 hard timeouts in 21 requests

First round, 6 samples:

```
ipapi.is    : 20.002476 3.621783 0.662743 0.850584 1.621660 0.571576
```

Second round, 15 samples, `--max-time 25`:

```
sample 1: HTTP 200 0.582497s
sample 2: HTTP 200 0.596403s
sample 3: HTTP 200 0.588531s
sample 4: HTTP 200 0.649680s
curl: (28) Connection timed out after 25006 milliseconds
sample 5: HTTP 000 25.006498s
sample 6: HTTP 200 0.878002s
sample 7: HTTP 200 0.602146s
sample 8: HTTP 200 0.599575s
sample 9: HTTP 200 0.612138s
sample 10: HTTP 200 0.609789s
sample 11: HTTP 200 0.600642s
sample 12: HTTP 200 0.582842s
sample 13: HTTP 200 0.609131s
sample 14: HTTP 200 0.593759s
sample 15: HTTP 200 0.591765s
```

So: median ~0.60s, but 2/21 requests (~10%) never completed — one hit a 20s ceiling,
one a 25s ceiling. `elapsed_ms: 0.04` says the *server* is instant, so the stall is
network/edge, not query time. This is not a rate limit (no 429, and the neighbouring
requests succeeded).

Docs (<https://ipapi.is/pricing.html>): "You can make **1,000** free API requests per
day." "The free tier provides exactly the same data quality as paid plans. The only
difference is the query volume." Whether the 1,000/day is per-IP for *keyless* calls
is not stated anywhere I could find (documented only — gap).

## 4. ipwho.is vs ipapi.is comparison of steady-state latency

30 consecutive ipwho.is requests, zero failures:

```
=== ipwho.is burst: 15 sequential requests
req 1..15 -> HTTP:200 "success":true  t: 0.510–0.553s
=== ipwho.is 15 more samples
sample 1..15: HTTP 200  0.530–0.593s
```

Tightest distribution of any provider tested. No throttling at 30 requests in a row
(nowhere near the documented 1,000/day, so this proves burst tolerance only).

## 5. ipinfo.io — works keyless, but robots-disallowed on the `/json` path

```
$ curl -sS https://ipinfo.io/155.248.192.115/json
{
  "ip": "155.248.192.115",
  "city": "San Jose",
  "region": "California",
  "country": "US",
  "loc": "37.3394,-121.8950",
  "org": "AS31898 Oracle Corporation",
  "postal": "95110",
  "timezone": "America/Los_Angeles",
  "readme": "https://ipinfo.io/missingauth"
}
[HTTP 200 | total 0.686837s]
```

No separate `isp` — only `org`, with the ASN glued to the front
(`"AS31898 Oracle Corporation"`), which MyIP splits on the first space.
No `country_name` — MyIP derives it from the code with `country-code-lookup`.

The newer token-gated endpoint refuses keyless:

```
$ curl -sS https://api.ipinfo.io/lite/155.248.192.115
{ "status": 403, "error": { "title": "Unknown token", "message": "Please ensure you've entered your token correctly. …" } }
[HTTP 403 | total 0.676254s]
```

robots.txt:

```
$ curl -sS https://ipinfo.io/robots.txt
User-agent: *
Disallow: /*?token*
Disallow: /*?callback*
Disallow: /*?hash*
Disallow: /*:*

Disallow: /*/json$
Disallow: /*/ip$
…
```

`Disallow: /*/json$` covers exactly `/155.248.192.115/json`. `Disallow: /*:*` covers
any IPv6 path. The bare form MyIP uses (`https://ipinfo.io/<ipv4>`) is *not* matched
by any pattern — so the same provider is disallowed or allowed depending on which URL
form you pick.

<https://ipinfo.io/missingauth> (WebFetch): unauthenticated legacy API gets "limited
data", "API requests limited to 50k requests/month", and "Our legacy API will continue
to work in the short term, but might receive less updates and be discontinued in the
future."

## 6. ipapi.co — 429 on the very first request

```
$ curl -sS -w '\n[HTTP %{http_code} | total %{time_total}s]\n' https://ipapi.co/155.248.192.115/json/
{"reason": "RateLimited", "message": "Please sign up for a paid plan at https://ipapi.co/pricing or contact us for a trial account", "wait": 1.0, "error": true}
[HTTP 429 | total 0.830073s]
```

Retried later in the session — same 429. Never got a single successful response, so I
have **no sample body** for this provider.

Confound: I cannot tell whether my exit IP had already burned its daily quota (other
tooling on this machine, or a shared CGNAT neighbour) or whether ipapi.co blocks this
network outright. Either way, from this vantage point the free tier is unusable.

robots.txt: `User-agent: *` / `Allow: /` — the only provider that explicitly permits
everything.

Docs (<https://ipapi.co/#pricing>): free is "Up-to 1000 / day", HTTPS included, no key,
but "Suitable for testing / development", explicitly **"Not for production use"** and
"not meant for use in production or deployments." That clause alone disqualifies it for
a distributed extension regardless of the 429.

## 7. freeipapi.com — redirects to `free.` host, no `isp`, weakest accuracy

```
$ curl -sS -w '…' https://freeipapi.com/api/json/155.248.192.115
<html><head><title>302 Found</title></head>…<hr><center>cloudflare</center>…
[HTTP 302]
```

With `-L`:

```
$ curl -sS -L https://freeipapi.com/api/json/155.248.192.115
{"ipVersion":4,"ipAddress":"155.248.192.115","latitude":37.2318,"longitude":-121.782,"countryName":"United States","countryCode":"US","capital":"Washington D.C.","phoneCodes":[1],"timeZones":["America/Adak","America/Anchorage",… 30 zones …],"zipCode":"95115","cityName":"San Jose","regionName":"California","regionCode":"CA","continent":"Americas","continentCode":"AM","currencies":["USD","USN","USS"],"languages":["en"],"asn":"31898","asnOrganization":"Oracle Corporation","isProxy":false}
[HTTP 200 | total 1.200775s | redirects 1 | final https://free.freeipapi.com/api/json/155.248.192.115]
```

The documented host is `free.freeipapi.com`; the apex 302s to it. No `isp` field —
`asnOrganization` is the only ISP-ish string. The payload carries all 30 US timezones
and a currency list, i.e. mostly waste for this card.

Error handling is the worst of the group — garbage input returns HTTP 200 with an
all-`null` body:

```
$ curl -sS -L -w '\n[HTTP %{http_code}]\n' https://free.freeipapi.com/api/json/notanip
{"ipVersion":null,"ipAddress":null,"latitude":null,…,"asnOrganization":null,"isProxy":false}
[HTTP 200]
```

robots.txt (identical on apex and `free.` host):

```
User-agent: *
Disallow: /api/
Disallow: /dashboard
…
```

Docs (WebFetch of <https://freeipapi.com/>): "to prevent heavy loads on our servers we
apply a limit of 60 requests per minute", no account required, "Commercial use
allowed", endpoint `https://free.freeipapi.com/api/json/{ip-address}`.

## 8. api.ip.sb — not on the ticket list, found via MyIP; UA-gated

MyIP's `api/ip-sb.js` calls it with no token, so I probed it. Default curl UA:

```
$ curl -sS -w '\n[HTTP %{http_code}]\n' https://api.ip.sb/geoip/155.248.192.115
<html><head><title>403 Forbidden</title>…<hr><center>nginx</center>…
[HTTP 403]
```

With a browser UA:

```
$ curl -sS -A 'Mozilla/5.0 (Macintosh; …) Chrome/126.0 Safari/537.36' https://api.ip.sb/geoip/155.248.192.115
{"region":"California","organization":"Oracle Cloud","region_code":"CA","isp":"Oracle Cloud","city":"San Jose","asn_organization":"Oracle Corporation","postal_code":"95119","asn":31898,"latitude":37.2379,"ip":"155.248.192.115","continent_code":"NA","offset":-28800,"country":"United States","timezone":"America/Los_Angeles","country_code":"US","longitude":-121.7946}
[HTTP 200]
```

`country: "United States"`, `region: "California"`, `city: "San Jose"`,
`isp: "Oracle Cloud"`, `country_code: "US"` — a **field-for-field, value-for-value
match** with the `ip.net.coffee/api/geoip` body recorded in the ticket's carried notes.
Strong hint that the prior art is proxying ip.sb or the same underlying dataset
(inferred — cannot confirm without calling the off-limits endpoint).

robots.txt: `User-agent: *` / `Disallow:` (empty = allow everything) + a sitemap.

Docs (WebFetch of <https://ip.sb/api/>): "The free API allows 100 requests per minute
per IP address (up to 5 per second)". No key for free. On the UA gate, the docs say it
outright: "Most HTTP libraries send a default User-Agent that the edge blocks, so each
example sets a custom one." And: "If you need a higher limit, an API key, or you are
shipping a commercial product, take a look at our plans or get in touch."

Latency, 6 samples: `0.566984 0.520251 0.483301 0.513210 0.509284 0.515072` — fast and
steady, comparable to ipwho.is.

## 9. Latency summary (6 samples each, seconds, from HK)

```
ipwho.is    : 0.539821 0.537886 0.533301 0.514306 0.527349 0.522070
ipapi.is    : 20.002476 3.621783 0.662743 0.850584 1.621660 0.571576
ip-api HTTP : 0.446647 0.184195 0.187964 0.183912 0.174660 0.174419
freeipapi   : 0.718107 0.720494 0.743696 0.710821 0.718638 0.736262
ipinfo bare : 0.692336 0.689596 0.687212 0.679113 0.694546 0.689886
ip.sb (UA)  : 0.566984 0.520251 0.483301 0.513210 0.509284 0.515072
```

ip-api.com over plain HTTP is by far the fastest — no TLS handshake, and it is the one
provider not behind Cloudflare. That speed is the reward for the cleartext it is
disqualified for.

## 10. Accuracy matrix — 6 IPs, 4 providers

Format: `country | region | city | isp/org | ASN`

```
########## IP: 155.248.192.115   (Oracle Cloud us-sanjose-1)
  ipwho.is    : United States | California | San Jose | Oracle Corporation | AS 31898
  ipapi.is    : United States | California | San Jose | Oracle Public Cloud | AS 31898 | dc: True vpn: False proxy: False tor: False | acc: MEDIUM
  ip-api(http): United States | California | San Jose | Oracle Corporation | AS31898 Oracle Corporation
  freeipapi   : United States | California | San Jose | Oracle Corporation | AS 31898 | proxy: False

########## IP: 8.8.8.8   (Google Public DNS, anycast)
  ipwho.is    : United States | California | San Jose | Google LLC | AS 15169
  ipapi.is    : United States | California | Mountain View | Google LLC | AS 15169 | dc: True vpn: True proxy: False tor: False | acc: HIGH
  ip-api(http): United States | Virginia | Ashburn | Google LLC | AS15169 Google LLC
  freeipapi   : United States | California | Mountain View | Google LLC | AS 15169 | proxy: False

########## IP: 1.1.1.1   (Cloudflare, anycast, APNIC-registered AU)
  ipwho.is    : Australia | Queensland | Brisbane | Cloudflare, Inc. | AS 13335
  ipapi.is    : Australia | Queensland | Brisbane | APNIC Research and Development | AS 13335 | dc: False vpn: True proxy: False tor: False | acc: MEDIUM
  ip-api(http): Australia | Queensland | South Brisbane | Cloudflare, Inc | AS13335 Cloudflare, Inc.
  freeipapi   : Australia | New South Wales | Sydney | Cloudflare, Inc. | AS 13335 | proxy: False

########## IP: 104.28.246.77   (Cloudflare WARP-range)
  ipwho.is    : United States | California | Anaheim-Santa Ana-Garden Grove | Cloudflare, Inc. | AS 13335
  ipapi.is    : United States | California | Santa Ana | Cloudflare, Inc. | AS 13335 | dc: True vpn: False proxy: False tor: False | acc: VERY_HIGH
  ip-api(http): United States | California | Santa Ana | Cloudflare, Inc. | AS13335 Cloudflare, Inc.
  freeipapi   : Canada | Ontario | Toronto | Cloudflare, Inc. | AS 13335 | proxy: False

########## IP: 185.220.101.1   (known Tor exit relay)
  ipwho.is    : Germany | Brandenburg | Schonwalde-Glien | Stiftung Erneuerbare Freiheit | AS 60729
  ipapi.is    : Germany | State of Berlin | Mitte | Artikel10 e.V. | AS 60729 | dc: False vpn: False proxy: True tor: True | acc: HIGH
  ip-api(http): Germany | Brandenburg | Brandenburg an der Havel | Stiftung Erneuerbare Freiheit | AS60729 Stiftung Erneuerbare Freiheit
  freeipapi   : Germany | State of Berlin | Berlin | Stiftung Erneuerbare Freiheit | AS 60729 | proxy: False

########## IP: 2600:1f18:1::1   (AWS IPv6)
  ipwho.is    : United States | Virginia | Washington | Amazon.com, Inc. | AS 14618
  ipapi.is    : United States | Virginia | Ashburn | Amazon.com, Inc. | AS 14618 | dc: True vpn: False proxy: False tor: False | acc: VERY_HIGH
  ip-api(http): United States | Virginia | Ashburn | Amazon.com, Inc. | AS14618 Amazon.com, Inc.
  freeipapi   : United States | Virginia | Ashburn | Amazon.com, Inc. | AS 14618 | proxy: False
```

Readings:

- **Country: unanimous on all 6.** Every provider, every IP. Country is a solved
  problem — which matters because `cdn-cgi/trace` already gives it for free.
- **Region/city: disagreement on 4 of 6.** Anycast IPs (8.8.8.8, 1.1.1.1) are
  irreducibly ambiguous, so those two are not a fair test. But 104.28.246.77 is: three
  providers say US/California/Santa Ana, **freeipapi says Canada/Ontario/Toronto** —
  wrong country, the one field users notice.
- **Proxy detection: only ipapi.is finds the Tor relay.** `is_tor: True, is_proxy:
  True` on 185.220.101.1; freeipapi's `isProxy: false` is a miss, and ipwho.is/ip-api
  have no such field at all.
- **ipapi.is over-flags VPN**: `is_vpn: True` on 8.8.8.8 and on 1.1.1.1. False
  positives on the two most famous public resolvers on the internet.
- **ipwho.is emits metro-area city labels**: `"Anaheim-Santa Ana-Garden Grove"` for
  104.28.246.77, `"Schonwalde-Glien"` for the German relay. Correct-ish, but a 34-char
  city string will crowd the card's one line.
- **ISP string differs in kind, not just wording**: `Oracle Corporation` (ipwho.is
  `connection.isp`, ip-api `isp`, freeipapi `asnOrganization`) vs `Oracle Public Cloud`
  (ipapi.is `company.name`) vs `Oracle Cloud` (ip.sb `isp`; and ip.net.coffee). The
  card's reference screenshot shows "Oracle Cl…", i.e. the ip.sb/`ip.net.coffee`
  wording — only ip.sb reproduces it exactly.

## 11. robots.txt sweep — the surprise

```
ipwho.is            → HTTP 404, no robots.txt at all
api.ipapi.is        → HTTP 404, "Cannot GET /robots.txt"
api.ip.sb / ip.sb   → "User-agent: *" / "Disallow:"   (empty = allow all)
ipapi.co            → "User-agent: *" / "Allow: /"
ipinfo.io           → "Disallow: /*/json$"  (+ "/*:*", "/*/ip$", …)
freeipapi.com       → "Disallow: /api/"
free.freeipapi.com  → "Disallow: /api/"
ip-api.com          → "Disallow: /json$" / "Disallow: /json/"
```

Applied mechanically, the rule that ruled out `ip.net.coffee/api/geoip` also rules out
**ip-api.com, ipinfo.io (`/json` form), and freeipapi.com**. See the ticket answer for
why I think the rule should not be applied mechanically, and what still stands.

## 12. `~/GitHub/MyIP` — server-side, keyed, and not publicly callable

`api/` handler list: `ipinfo-io.js`, `ipapi-com.js`, `ipapi-is.js`,
`ip2location-io.js`, `ip-sb.js`, `ipcheck-ing.js`, `maxmind.js` — seven geo sources
behind one normalizing factory (`common/geo-handler.js`).

Keys, all from env, all server-side:

- `api/ipapi-is.js` — `process.env.IPAPIIS_API_KEY`, comma-split, random pick:
  `https://api.ipapi.is?q=${ipAddress}&key=${key}`
- `api/ipinfo-io.js` — `IPINFO_API_KEY || IPINFO_API_TOKEN`, falls back to keyless
  `https://ipinfo.io/${ipAddress}` when unset
- `api/ipapi-com.js` — **plain HTTP**: `http://ip-api.com/json/${ipAddress}?fields=66842623&lang=${lang}`
- `api/ip-sb.js` — genuinely token-free: `https://api.ip.sb/geoip/${ipAddress}`
- `api/ipcheck-ing.js` — `IPCHECKING_API_KEY` + a private `IPCHECKING_API_ENDPOINT`,
  called as `${apiEndpoint}/ipinfo?key=${key}&ip=${ip}&lang=${lang}`

### Is ipcheck.ing publicly callable? No — two locks.

1. The key. `api/ipcheck-ing.js` returns `500 {"error":"API key is missing"}` without
   `IPCHECKING_API_KEY`, and the upstream host itself is env-only
   (`IPCHECKING_API_ENDPOINT`) — not in the repo.
2. A global referer guard. `api/AGENTS.md`: "`requireReferer` — global on `/api/*`
   (ALLOWED_DOMAINS + localhost)". `common/guards.js`:

```js
export const requireReferer = (req, res, next) => {
    const referer = req.headers.referer;
    if (!refererCheck(referer)) {
        return res.status(403).json({
            error: referer ? 'Access denied' : 'What are you doing?',
        });
    }
    next();
};
```

`common/referer-check.js` returns `false` for a missing referer. So every
`ipcheck.ing/api/*` route is origin-locked by design. Same verdict as
`ip.net.coffee/api/`: field-set reference only, never a call target.

### One transferable pattern from MyIP

`frontend/utils/transform-ip-data.js` derives the country *name* locally from the
country *code* rather than trusting the upstream string:

```js
country_name: getCountryName(data.country, mapLanguage) || data.country_name || "",
```

with the comment: "Country display name is derived from the code locally (CLDR via
getCountryName) so every geo source shows the same, UI-language name; the upstream's
own string is only a fallback". `api/ipinfo-io.js` does the same server-side with the
`country-code-lookup` npm package. Relevant here: combined with `loc=US` from
`cdn-cgi/trace`, the extension can render flag *and* country name with no geo call at
all.

## 13. Sibling extension: what ipcheck-ing actually ships

`~/Projects/Raycast/extensions/extensions/ipcheck-ing/src/getIPDetails.ts`, verbatim:

```ts
import fetch from "node-fetch";

// Get the flag emoji for a given country code
function countryCodeToFlagEmoji(countryCode: string): string {
  return countryCode.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

// Get IP details
export async function getIPDetails(ip: string): Promise<string> {
  if (ip === "Get IP Failed") return "N/A";
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Error: ${data.message}`);
    }
    return `${data.city}, ${data.country} ${countryCodeToFlagEmoji(data.countryCode)}`;
  } catch (error) {
    console.error("Error fetching IP details:", error);
    return "Failed to fetch IP details";
  }
}
```

Three things worth carrying forward:

1. It ships a **cleartext `http://`** call in a Store-published extension. Precedent
   that review does not block it — not an argument that it is good.
2. Its line is `city, country flag` — **no region, no ISP**. Thinner than this card
   wants; `getIPDetails.ts` cannot be copied as-is to fill `country · region · city ·
   isp`.
3. `if (!response.ok) throw` is the wrong guard for a provider that answers 200 with
   `success:false`. Copying this shape onto ipwho.is would silently render
   `undefined, undefined 🏳` on a reserved-range IP.

## 14. Store precedent — who already calls what

```
$ rg -o -i '(ipwho\.is|ip-api\.com|ipapi\.is|ipinfo\.io|ipapi\.co|freeipapi\.com|api\.ip\.sb|…)' \
    /Users/ken/Projects/Raycast/extensions/extensions | sort | uniq -c | sort -rn
     19 ipinfo.io
     15 ip-api.com
      9 ipapi.is
      4 ipapi.co
      2 ipwho.is
      1 ipData.co
```

- ipwho.is: `extensions/purpleair/src/index.tsx:499` — `await fetch("https://ipwho.is/")`,
  keyless, wrapped in `withCache`. Shipped precedent.
- ipapi.is keyless: `extensions/ipapi-is/src/lookup-ip-or-asn.tsx:7` —
  `useFetch(\`https://api.ipapi.is?q=${ip}\`)`, no key. A whole published extension
  named after the provider, calling it keyless.
- `api.ip.sb`: zero hits. No Raycast precedent.
