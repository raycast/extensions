# App Hider Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Hide apps from `/Applications` and `~/Applications` by moving them into a Spotlight-excluded folder
- Restore hidden apps to their original location
- Launch hidden apps from Raycast
- Remove hidden apps from LaunchServices and refresh Launchpad, using the right method for each macOS version
- Offer to quit running apps before moving them
- Move system-owned apps (e.g. from the App Store) with administrator rights, after confirmation
- Roll back moves if the restore record can't be saved
- Detect hidden apps that were deleted or moved manually
