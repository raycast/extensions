# Raycast extension: Namecheap Domains

Manage your [Namecheap](https://www.namecheap.com/) domains from [Raycast](https://raycast.com/): list what you own, check whether a name is available, and start a registration.

## Commands

| Command | What it does |
| --- | --- |
| **Check Domain Availability** | Type a full domain (`acme.com`) to check it, or a bare keyword (`acme`) to check it against your default TLDs in one call. Shows the registration price, flags premium and early-access names, and lets you jump straight to registration. |
| **Register Domain** | Enter a domain and term, the extension verifies availability and price through the API, then opens Namecheap checkout in your browser. |
| **My Domains** | Lists every domain in your account with expiry date, auto-renew, privacy and lock status. Press **Enter** to open the domain's management page. Filter by All / Expiring / Expired. |

Registration itself happens on namecheap.com. The extension never charges your account balance.

## Setup

### 1. Enable API access

Namecheap only enables the production API for accounts that meet **one** of these:

- at least 20 domains in the account, or
- at least $50 account balance, or
- at least $50 spent in the last two years.

To enable it: sign in, go to **Profile › Tools**, scroll to **Business & Dev Tools › Namecheap API Access**, click **Manage**, toggle it on and accept the terms. Namecheap then shows your **API key**. Your account username is your **API user**.

If your account does not qualify yet, use the free **Sandbox**: create a separate account at [sandbox.namecheap.com](https://www.sandbox.namecheap.com/), enable API access the same way at [ap.www.sandbox.namecheap.com/settings/tools/apiaccess/](https://ap.www.sandbox.namecheap.com/settings/tools/apiaccess/), and tick **Use the Namecheap Sandbox** in the extension preferences. Sandbox has its own separate whitelist, and its availability results do not reflect the real registry.

### 2. Whitelist your IP

Namecheap only accepts API calls from whitelisted **IPv4** addresses. On the same API Access page, click **Edit** next to *Whitelisted IPs* and add your current public IP.

Namecheap authorises **the address your Mac actually connects from**. The Client IP preference only fills a required API parameter and cannot stand in for a whitelist entry.

Leave that preference blank and the extension detects your public IPv4 automatically, via `api.ipify.org` with `checkip.amazonaws.com` as a fallback, and caches it for an hour. Pin a value there only to skip detection, for example on a network that blocks those hosts.

The address changes when you switch network or turn on a VPN, which breaks API access until you add the new one. Add your home, office and VPN addresses together to save yourself the trip. When a call is rejected, Namecheap names the exact address it saw, and the extension offers **Copy IP and Open Namecheap** to copy it and take you straight to the right page.

### 3. Fill in the preferences

| Preference | Required | Notes |
| --- | --- | --- |
| API User | yes | Usually your account username |
| API Key | yes | From Profile › Tools › Namecheap API Access |
| Username | no | Account the commands run against. Defaults to API User |
| Client IP | no | Fills the ClientIp API parameter. Blank = auto-detect. Not the whitelist |
| Use the Namecheap Sandbox | no | Targets `api.sandbox.namecheap.com`. Every link stays on the sandbox hosts, and each command's title is marked (Sandbox) |
| Default TLDs (Check Domain Availability) | no | Comma-separated list used when you type a keyword. Default: `com, net, org, io, dev, app, ai, co` |

## Good to know

- **Rate limits.** Namecheap allows 50 calls/minute, 700/hour and 8000/day per API key. Availability checks are debounced and batched (up to 50 domains per call); pricing is cached for 24 hours as Namecheap recommends. Use **Refresh Pricing** in Check Domain Availability to force a refresh.
- **Internationalized domains** are converted to punycode before they are sent, as the API requires.
- **Premium domains** show the premium registration price returned by Namecheap instead of the standard TLD price.
- **Prices** come from `users.getPricing` and reflect your account's pricing. A price followed by `+` has an ICANN fee on top, shown in the tooltip and spelled out before checkout. Names in a TLD's Early Access Program show "Price at checkout" rather than a figure, because the access fee dwarfs the registration price.
- Some TLDs (for example `.us`, `.eu`, `.ca`, `.co.uk`, `.de`, `.fr`) need extra registrant details. Namecheap collects those during web checkout.

## What the extension stores and sends

- **Your API key** is held by Raycast as a password preference, in its encrypted store. The extension sends it to Namecheap's API only (`api.namecheap.com`, or `api.sandbox.namecheap.com` in sandbox mode), in the body of a POST request, so it never appears in a URL that a proxy or CDN could log.
- **Your domain list** is kept in Raycast's encrypted storage, as a snapshot so the command still shows something when a refresh fails. It is never written to the plaintext cache.
- **What you search for** in Check Domain Availability stays in memory for the session and is not written to disk.
- **TLD pricing** is cached on disk for a day, as Namecheap asks API users to do. It is the same public price list for everyone.
- **Your public IP** is looked up from `api.ipify.org`, falling back to `checkip.amazonaws.com`, when the Client IP preference is blank. Those services receive nothing but the request itself. Set the preference to skip the lookup entirely.
- **Nothing else leaves your machine.** There is no analytics or telemetry, and domain names are not sent to any favicon or preview service.

**Clear Stored Data**, in the action panel of My Domains or Check Domain Availability, removes the domain snapshot, the detected IP and the pricing cache. It does not touch your API key, which lives in Raycast's preferences; clear that field yourself when rotating a key or handing on a Mac.

The extension never spends money. Registration always finishes in your browser on namecheap.com, and no command calls Namecheap's purchase endpoints.

## Development

```bash
npm install
npm run dev      # loads the extension into Raycast (requires the Raycast app)
npm run build    # production build + type check
npm run lint     # ray lint
npm test         # unit tests: parsing, pricing shapes, domain normalization, error handling
npm run typecheck # type-checks src, tests and scripts together
```

There is also a Raycast-free smoke test that talks to the API directly. Point it at the sandbox:

```bash
NC_API_USER=youruser NC_API_KEY=yourkey NC_SANDBOX=1 npm run smoke -- check acme.com,acme.io
NC_API_USER=youruser NC_API_KEY=yourkey NC_SANDBOX=1 npm run smoke -- list
NC_API_USER=youruser NC_API_KEY=yourkey NC_SANDBOX=1 npm run smoke -- pricing com
npm run smoke -- ip   # prints the public IPv4 the extension would send
```


## About

This is an unofficial, community-built extension. It is not affiliated with or endorsed by Namecheap, Inc. Namecheap is a trademark of Namecheap, Inc.

## License

MIT
