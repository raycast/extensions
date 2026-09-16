# Setting up Namecheap Domains

You need two things from Namecheap: an **API key**, and your current **IP address on the whitelist**. Both live on the same page.

## 1. Enable API access

Sign in at [namecheap.com](https://www.namecheap.com/), then go to **Profile › Tools**, scroll to **Business & Dev Tools**, and click **Manage** next to *Namecheap API Access*. Switch it on and accept the terms.

Namecheap shows your **API Key** there. Your account username is your **API User**.

Production API access requires one of the following on the account:

- at least 20 domains, or
- at least $50 balance, or
- at least $50 spent in the last two years.

If you do not qualify, Namecheap's API intro invites you to contact their support team. You can also tick **Use the Namecheap Sandbox** below and create a free account at [sandbox.namecheap.com](https://www.sandbox.namecheap.com/), but sandbox domains are not real.

## 2. Whitelist your IP address

**This is the step people miss, and nothing works without it.**

On that same API Access page, click **Edit** next to *Whitelisted IPs*, then **Add IP**, and save.

A few things worth knowing:

- Namecheap authorises **the address your Mac actually connects from**, not anything this extension sends. The Client IP preference cannot substitute for a whitelist entry.
- Only IPv4 addresses are accepted, one at a time. Ranges do not work.
- The address changes when you switch network or turn a VPN on, which breaks API access until you add the new one. **Add your home, office and VPN addresses together** to save yourself the trip.
- Sandbox is a separate account with its own separate whitelist. Whitelisting on production does not carry over.

If you have already run a command and seen an error, Namecheap told you the exact address it rejected. The extension shows it with a **Copy IP and Open Namecheap** action that copies it and takes you straight to the right page.

## 3. Fill in the fields

| Field | Notes |
| --- | --- |
| API User | Usually the same as your account username |
| API Key | From the API Access page above |
| Username | Only if it differs from API User |
| Client IP | Leave blank to detect automatically |
| Use the Namecheap Sandbox | Only for a sandbox account |

## Your key

Raycast keeps the API key in its encrypted store. The extension sends it only to Namecheap, in the body of a POST request rather than in a URL, so it does not end up in proxy or CDN logs. It is never sent anywhere else.
