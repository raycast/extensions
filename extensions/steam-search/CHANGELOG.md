# Steam Search Changelog

## [Initial Release] - {PR_MERGE_DATE}

### Added
- Real-time Steam store search
- Live player counts and 24h peak via SteamCharts
- Review scores with color coding (green/yellow/red)
- Steam pricing with discount display
- GG.deals keyshop price integration (🔑) with correct currency symbol per region
- Owned game detection via Steam API — owned games show playtime in a green badge
- Wishlisted games tagged in search results
- Recently Played view — last 10 played games with playtime, live player counts, review scores, and achievement progress
- Wishlist Discounts view — wishlisted games on sale sorted by discount, with original price in gray, sale price in green, and GG.deals keyshop prices
- Friends Online view — friends split into In-Game / Online / Away sections, with game icons and one-press chat
- Open in Steam client, GG.deals, SteamDB actions
- Cross-platform keyboard shortcuts (Ctrl on Windows, Cmd on macOS)
- Region & currency selector supporting 14 regions
- Selection-based lazy loading — details only fetch for the hovered game
- Batch GG.deals fetching — one request for all results at once
- Local cache with 1-hour TTL, region-aware to prevent stale prices
- Onboarding screen on first launch with links to get API keys
- All credentials optional — extension works without any setup
