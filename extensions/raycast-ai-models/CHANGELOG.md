# Raycast AI Models Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Initial release of the Raycast AI Models extension.
- Features:
  - Browse and compare Raycast AI models in a searchable list.
  - Multiple sorting options: Intelligence, Speed, Intelligence → Speed, Speed → Intelligence, and Combined weighted score.
  - Model detail view with capabilities, abilities, and provider information.
  - Stale-while-revalidate caching with LocalStorage + in-memory cache for fast loads.
  - Manual refresh action and copy-to-clipboard actions for model ID / JSON.
  - Favicon caching for provider icons and optimized rendering using memoization.
- Notes:
  - No platform-specific APIs used; extension targets macOS.
  - See `README.md` for full usage and development commands.

