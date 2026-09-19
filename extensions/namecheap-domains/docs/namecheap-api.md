# How the Namecheap API actually behaves

Everything here was confirmed against the live API. Where Namecheap's published documentation disagrees, the wire wins, and several of the entries below exist precisely because the documentation is wrong.

## Authorisation runs on the source IP

Namecheap checks its allowlist against **the TCP source address of the connection**, and ignores the value of the `ClientIp` parameter. Sending `ClientIp=198.51.100.7` from a different address still returns `Invalid request IP: <the real address>`.

The parameter is still required, and is checked for presence and IPv4 shape:

| Problem | Error |
| --- | --- |
| Parameter absent | `1010105` |
| Parameter malformed | `1011105` |
| Source address not allowlisted | `1011150` |

So the Client IP preference cannot fix a `1011150`, and any hint that suggests it can is wrong. `src/namecheap/parse-hints.ts` keeps these separate for that reason.

Error `1011150` names the rejected address in its message. `NamecheapApiError.requestIp` extracts it, and the recovery UI shows that value rather than a locally detected one, because a VPN or split tunnel makes the two differ.

## Credentials are validated before the allowlist

Both sandbox and production check `ApiUser` plus `ApiKey` first, and only then the source address. A nonexistent user returns `1011102`, never `1011150`.

That ordering is diagnostic: **reaching `1011150` proves the credentials resolved to a real account with API access enabled.** The remedy is the allowlist alone, and resetting the key is wasted effort.

Watch out when probing this by hand: `demo`/`demo` is a real, API-enabled sandbox account, so it reaches the IP gate and makes the two environments look like they check things in a different order. They do not.

## The published error table disagrees with the wire

Build hint maps from observed responses:

| Code | Documented as | Actually returned |
| --- | --- | --- |
| `1011102` | Parameter APIKey is missing | API Key is invalid or API access has not been enabled |
| `1010105` / `1011105` | Both "Parameter ClientIP is missing" | Missing and invalid respectively |

`1011102` conflates an invalid key with API access being switched off, so a hint for it needs to mention both.

## Environments are separate accounts

| | Host | Panel |
| --- | --- | --- |
| Production | `api.namecheap.com` | `ap.www.namecheap.com/settings/tools/apiaccess/` |
| Sandbox | `api.sandbox.namecheap.com` | `ap.www.sandbox.namecheap.com/settings/tools/apiaccess/` |

Separate accounts, separate keys, separate allowlists. Nothing carries over, which is why setup links follow the sandbox preference rather than pointing at production.

`ap.sandbox.namecheap.com` has no DNS record. The panel host carries the `www`.

Production API access needs one of: 20 domains on the account, $50 balance, or $50 spent in two years. Sandbox has no such gate, and its domain data is fictional.

## Request shape and limits

POST works for every command used here and keeps the key out of the URL. Parameters are form-encoded; the command name takes a `namecheap.` prefix.

- Rate limits are 50 per minute, 700 per hour, 8000 per day, per key.
- `domains.check` accepts at most 50 domains per call, so `checkDomains` chunks.
- `domains.getList` caps `PageSize` at 100, so `listAllDomains` walks pages.
- Dates come back as `MM/DD/YYYY` and booleans as the strings `"true"`/`"false"`, which is why `parse.ts` converts explicitly rather than trusting the parser.

## Response parsing

An element that repeats once parses as a single object and twice as an array, so `parse.ts` forces the repeating tags into arrays. An `<Error>` carrying no attributes parses as a bare string rather than an object, and losing that case drops the message.

The parser is configured against hostile input, verified: external entities are rejected, entity expansion does not blow up, and deep nesting hits a depth cap. Non-XML bodies matter in practice because a CDN fronts the API and answers with HTML for 403 and 429, so a non-2xx response that fails to parse is reported with its status rather than as a parse error.

## Pricing responses differ from the documented example

Two divergences, both confirmed against the response captured in Namecheap's own Go SDK
(`namecheaptest/fixtures/users_getPricing.xml`). Each one silently produced wrong output here, so
`tests/pricing-live-shape.test.ts` pins both against that fixture.

The product type comes back as `domains`, where the documentation example shows `DOMAIN`. Matching the
documented spelling skips every product and yields an empty price table with a 200 OK, so nothing surfaces
as an error.

Price rows carry placeholder figures. A row can read `Price="0.0"` with `YourPrice="10.50"`, or `Price=""`
with `YourPrice="0.00"` and `RegularPrice="9.18"`. Taking the first value that is *present* quotes those
domains at nothing, so `parsePricing` takes the first value that is *positive* across Price, YourPrice and
RegularPrice, which is what Namecheap's own SDK does.

## Availability has no price signal

`domains.check` reports whether a registration record exists. Premium names come back available with a premium price attached, and pricing for ordinary names comes from `users.getPricing`, which Namecheap asks callers to cache. The extension caches it for a day.
