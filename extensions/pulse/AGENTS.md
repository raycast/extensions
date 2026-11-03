# Pulse for Raycast

- A Raycast Store extension with one command, Search Symbol. Keep it a lookup
  tool: no menu-bar command and no watchlist, so it does not duplicate Pulse
  for Mac. Watchlists over the Mac app's local MCP are a later version.
- Search reuses Pulse's published catalog (`symbols-v1.json`, built by
  pulse-server) and the Mac app's ranking (exact, then prefix, then substring;
  popularity inside a tier). Never build a separate index or call a search API.
- The only hosts are `www.pulseticker.app` (the catalog),
  `query1.finance.yahoo.com` and `data-api.binance.vision`. Quote logic is
  ported from `herdr/pulse/mods/pulse/quotes.js`; keep their behavior in step.
- Download the catalog at most once a day, conditionally (ETag), and refuse a
  file far smaller than the one in hand.
- Respect Yahoo cooldowns; never show cached data as fresh or an unknown delay
  as real time.
- Promote Pulse for Mac only, with `utm_source=raycast`; name no other edition.
- Follow Raycast's Store rules: US English UI, Title Case action titles,
  `CHANGELOG.md` with `{PR_MERGE_DATE}`, `package-lock.json` committed,
  `npm run lint` and `npm run build` clean before publishing.
- Releases go through `.github/workflows/release-raycast.yml` (tag
  `raycast-v*` or manual run, environment `raycast`): GitHub sign-in by device
  code approved with the owner's passkey, then `ray publish`. Never store a
  GitHub token for it.
