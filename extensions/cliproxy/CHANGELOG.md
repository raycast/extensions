# CLIProxyAPI Changelog

## [Quota Collection Across Providers] - {PR_MERGE_DATE}

- Show every connected provider in Overview and Chart Options, including custom providers.
- Collect Antigravity, xAI, Meta, Kimi, Kimi AI and Devin quota alongside Codex and Claude.
- Discover CPA quota plugins and record their percentage windows in usage history.
- Preserve provider-specific periods and keep unavailable quota unknown.
- Use green Antigravity charts and replace the six existing screenshots with multi-account examples.

## [Show Quota History Errors] - {PR_MERGE_DATE}

- Show history read and write failures on quota charts, including when cached history is available.

## [Usage Charts and Forecasts] - {PR_MERGE_DATE}

- Add bundled Antigravity, Meta and xAI icons to account and provider views.
- Add full-width seven-day forecast and hourly drain-rate views with keyboard switching.
- Record quota history locally during refreshes and optional 15-minute background sampling.
- Exclude resets and missing observations from hourly averages; project each account using measured drain and reported resets.

## [Updated Icon, Compact Summaries and Screenshots] - {PR_MERGE_DATE}

- Replace the icon with the supplied square artwork and rounded transparent corners.
- Shorten provider summaries to keep the weekly quota on one line.
- Add screenshots of Details, Limits and Overview using sample accounts.

## [Initial Version] - {PR_MERGE_DATE}

- Auth files, quota windows, cooldowns, reset credits/grants
