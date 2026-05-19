# Steam Search Changelog

## 1.0.0 - {PR_MERGE_DATE}

### Added
- Initial release
- Real-time Steam store search
- Live player counts and 24h peak via SteamCharts
- Review scores with color coding (green/yellow/red)
- Steam pricing with discount display
- GG.deals keyshop price integration (🔑) with correct currency symbol per region
- Owned game detection via Steam API with green Owned badge
- Open in Steam client, GG.deals, SteamDB actions
- Cross-platform keyboard shortcuts (Ctrl on Windows, Cmd on macOS)
- Region & currency selector supporting 14 regions
- Selection-based lazy loading — details only fetch for the hovered game
- Batch GG.deals fetching — one request for all results at once
- Local cache with 1-hour TTL, region-aware to prevent stale prices
- Onboarding screen on first launch with links to get API keys
- All credentials optional — extension works without any setup