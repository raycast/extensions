# Changelog

## [Grid Size] - 2026-10-24

- Add a Grid Size preference: Small (8 columns, the new default), Medium (6 columns, the previous layout) or Large (4 columns).
- Add a Grid Size submenu to the Action Panel. The choice is remembered until the preference is changed.

## [User Browsing and Saved Search] - 2026-10-22

- Add 7TV user search with separate channel-emote and creator-upload commands.
- Remember recently opened users separately in both browsing commands, with remove and clear actions.
- Show complete user avatars without a circular crop.
- Show personal-set usage status and exclude private or unlisted entries from user browsing.
- Show matching favorites and recently used emotes while searching in grid and list views.
- Remember the provider, sort order, view, and animated-only filter between command sessions.
- Restore README credit for n4kama’s GIF/PNG clipboard contribution.

## [Emote Size] - 2026-10-20

- Add an Emote Size preference (1x to 4x, 2x by default) for pasted and copied emotes. When a size is missing, the closest smaller one is used.
- Add Paste Emote at Size to the Action Panel to paste a single emote at another size.

## [Providers and Search Fixes] - 2026-10-19

- Add BetterTTV and FrankerFaceZ to Search Emotes, informed by Kan-A-Pesh's Emotecast.
- Replace Drop Emote and Quick Drop with Paste Emote File. Keep the alternative keyboard shortcut on the same action.
- Rename Force Paste URL to Paste Emote URL.
- Credit Kan-A-Pesh for the multi-provider references.
- Use native GIF files for animated emotes and PNG for static emotes when available.
- Fix 7TV Popular, Recently Created, and Trending with its current API.
- Add pagination, matching-result counts where available, and an animated-only filter.
- Preserve existing 7TV favorites and recent history across updates, including actions taken while saved data is still loading.
- Keep the animated-only filter action available in empty grid and list results.
- Hide 7TV alphabetical sorting while its API returns an error.

## [1.0.0] - 2026-04-25

### Added

- Initial release of 7TV Emotes Search.
- Support for searching global 7TV emotes.
- "Popular", "Trending", and "Recently Created" filters.
- Direct "Drop Emote" and "Quick Drop" actions for messaging apps.
- Starred Emotes (Favorites) and Recently Used (History) persistence.
- High-fidelity Iridescent 7TV branding.
