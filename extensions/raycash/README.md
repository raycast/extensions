# Raycash — Raycast Menu Bar Extension

Account balances and recent transactions from every institution you've linked to SimpleFIN Bridge, in the macOS menu bar. Read-only.

---

## 0. Regenerate your setup token first

If a setup token has been pasted anywhere it shouldn't have been (chat, notes, a commit), kill it:

1. https://beta-bridge.simplefin.org/ → **My Account** → **Apps**
2. Delete the connection
3. **New Connection** → **Create Setup Token**

Setup tokens are single-use, but anyone who claims yours before you do gets a permanent read-only Access URL to all linked accounts.

## 1. Claim the token (one time, in your own terminal)

The token is a base64-encoded claim URL. Decode it, POST to it, and you get back the Access URL:

```bash
TOKEN='paste-your-setup-token-here'
CLAIM_URL=$(echo "$TOKEN" | base64 --decode)
curl -s -X POST "$CLAIM_URL"
```

Output looks like:

```
https://SOMEUSER:SOMEPASS@beta-bridge.simplefin.org/simplefin
```

That is a **credential**. It grants read access to every linked account and does not expire on its own. Treat it like a password — do not commit it, do not paste it into a chat, do not put it in a `.env` you sync.

Verify it works before touching Raycast:

```bash
ACCESS_URL='https://SOMEUSER:SOMEPASS@beta-bridge.simplefin.org/simplefin'
curl -s "$ACCESS_URL/accounts?start-date=$(( $(date +%s) - 604800 ))" | head -c 2000
```

> Each of those curls counts against your daily quota (~24 requests). Don't loop them.

## 2. Install

```bash
cd raycash
npm install
npm run dev
```

`ray develop` builds the extension and installs it into your local Raycast. Leave it running while you iterate — it hot-reloads.

Raycast will generate `raycast-env.d.ts` on first build (typed preferences). It's gitignored.

You need a 512×512 `assets/command-icon.png` before `ray build` will succeed. Any placeholder works during development.

## 3. Configure

Raycast → Extensions → Raycash:

| Preference | Notes |
|---|---|
| **SimpleFIN Access URL** | The URL from step 1. `password` type, so it lands in Keychain rather than Raycast's plaintext prefs store. |
| **Transaction History** | Days of history to request. SimpleFIN caps a single request at 90 days. |
| **Transactions Per Account** | How many show in each submenu. |
| **Menu Bar Title** | Net total, or icon only if you'd rather not have your net worth on screen during a call. |
| **Invert Sign For** | Comma-separated name fragments, e.g. `visa, amex, mortgage`. See below. |
| **Minimum Fetch Interval** | Hard floor between network calls. |

### The sign problem

Institutions disagree about whether a credit card balance is positive or negative. MX (SimpleFIN's upstream) doesn't fully normalize this. Open the menu, find any account whose sign is backwards for net-worth math, and add a fragment of its name to **Invert Sign For**. Matching is case-insensitive substring against account name + institution name + domain.

## 4. Quota behavior — the part that matters

SimpleFIN allows roughly **24 `/accounts` requests per day**. Exceeding it produces warnings in the `errors` array and then **disables your access token**. Recovering means re-claiming a new setup token.

This extension defends against that in three layers:

1. `interval: "2h"` in `package.json` → 12 scheduled background refreshes per day.
2. `minIntervalMinutes` (default 90) → opening the menu serves cache unless the data is older than that.
3. `MAX_REQUESTS_PER_DAY = 18` in `src/simplefin.ts` → a hard counter that stops all network calls for the rest of the day. "Refresh Now" additionally can't fire more than once per 20 minutes.

Upstream data only refreshes about once daily per institution anyway, so tighter polling gains nothing.

## 5. Architecture

```
src/simplefin.ts    API client, cache, quota counter, formatting helpers
src/balances.tsx    MenuBarExtra: sections per institution, submenu per account
```

The Access URL arrives with credentials embedded as userinfo (`https://user:pass@host/...`). Node's `fetch` does not reliably forward those, so `buildRequest()` strips them out and sends an explicit `Authorization: Basic` header instead. This is the single most common failure mode when writing a SimpleFIN client — if you get a 403 with a URL that works in `curl`, that's why.

## 6. Ideas once it's running

- A `view` mode command with `<List>` + search across all transactions, sharing the same cache
- Menu bar title that shows one designated account instead of the net total
- Large-transaction alerts via `showHUD` on the background refresh
- Write the daily snapshot to a local SQLite file for net-worth history over time

## Reference

- SimpleFIN protocol: https://www.simplefin.org/protocol.html
- SimpleFIN developer guide: https://beta-bridge.simplefin.org/info/developers
- Raycast menu bar commands: https://developers.raycast.com/api-reference/menu-bar-commands
- Raycast preferences: https://developers.raycast.com/api-reference/preferences
- Raycast Cache API: https://developers.raycast.com/api-reference/cache
