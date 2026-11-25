# App Hider Changelog

## [Initial Version] - 2026-11-22

- Hide apps from `/Applications` and `~/Applications` by moving them into a Spotlight-excluded folder
- Restore hidden apps to their original location
- Launch hidden apps from Raycast
- Remove hidden apps from LaunchServices and refresh Launchpad, using the right method for each macOS version
- Offer to quit running apps before moving them
- Move system-owned apps (e.g. from the App Store) with administrator rights, after confirmation
- Save the restore record before hiding an app, and repair records left by an interrupted hide or restore
- Detect hidden apps that were deleted or moved manually
