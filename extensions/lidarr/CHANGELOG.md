# Lidarr Changelog

## [Migration and Initial Version] - {PR_MERGE_DATE}

- Migrated extension from Sonarr (TV) to Lidarr (music)
- Replaced TV-series commands with Lidarr-native commands:
  - Artist Library
  - Search Artist
  - Download Queue
  - History
  - Instance Status
- Switched API integration from `/api/v3` Sonarr endpoints to `/api/v1` Lidarr endpoints
- Added artist add flow with root folder, quality profile, and metadata profile selection
- Updated preferences, metadata, and docs for Lidarr defaults (port `8686`)
