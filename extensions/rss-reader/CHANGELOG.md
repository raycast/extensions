# RSS Reader Changelog

## [Rename Subscriptions] - {PR_MERGE_DATE}

- Rename feed subscriptions and restore original titles

## [Add Cache] - {PR_MERGE_DATE}

- Prefill Add Subscription with the active browser tab URL when the Raycast Browser Extension is available
- Add 15 minutes cache for Read All Stories command selection

## [AI Tool Support] - {PR_MERGE_DATE}

- Add AI tool support for interacting with RSS feeds via Raycast AI
- Add tools: get-feeds, get-stories, add-feed, remove-feed, rename-feed, mark-as-read
- Add confirmation dialog for removing feeds

## [Fix Feeds Not Moving] - {PR_MERGE_DATE}

- Fixed moving feed up or down (ref: [Issue #18308](https://github.com/raycast/extensions/issues/18308))

## [Stories Remember 'Last Read'] - {PR_MERGE_DATE}

- Filter Stories by their read status (read or unread) (ref: [Issue #16546](https://github.com/raycast/extensions/issues/16546))
- Stories show an `Icon` to represent their read status
- Add README.md

## [Add Favicons and Detail View] - {PR_MERGE_DATE}

- Add favicons and subtitles to the story list view
- Switch to story list view when adding a new feed
- Add feed title as story subtitle in the story list view
- add confirmation when deleting a feed
- Add detail view to read story from raycast
- add dropdown to select feed in the story list
- add confirmation alert when running a destructive action

## [Update] - {PR_MERGE_DATE}

- Updated Raycast API to 1.39.0
- Fixed typo in searchBarPlaceholder
- Added metadata
- Fixed empty state flicker
