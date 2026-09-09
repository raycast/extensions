# CodexRunway Reset Tracker Changelog

## [Concurrent Refresh Fix] - {PR_MERGE_DATE}

- Wait for overlapping refreshes and reuse their cached result instead of immediately reporting failure

## [Interaction Verification Fixes] - {PR_MERGE_DATE}

- Match keywords anywhere in long announcements and sort dates across pages
- Pause automatic pagination during filtering and simplify identical time ranges
- Notify newly confirmed records that only provide an announcement timestamp

## [Completion Notifications] - {PR_MERGE_DATE}

- Add opt-in native macOS completion notifications during background refresh
- Establish a quiet baseline and deduplicate linked completion records
- Preserve retry eligibility when notification delivery fails

## [Continuous History] - {PR_MERGE_DATE}

- Load history continuously with native Raycast pagination
- Filter loaded records by plan and preserve search while loading more
- Stop automatic loading on failed updates and deduplicate record IDs

## [Upcoming Plans and Preferences] - {PR_MERGE_DATE}

- Summarize the next expected reset without treating elapsed plans as completed
- Add a subscription filter and an icon-only menu bar preference

## [Shared Request Budget] - {PR_MERGE_DATE}

- Share cached responses and request limits across all commands
- Respect retry headers and retain stale records with actionable warnings

## [Improve Reset Status and Navigation] - {PR_MERGE_DATE}

- Show the matching confirmed reset in details and the menu bar
- Simplify history rows, group by date, and search announcement text and scope
- Add keyboard pagination, refresh, clear filters, and menu bar navigation
- Distinguish loading, empty, and failed updates; display timezone and source freshness

## [Initial Version] - {PR_MERGE_DATE}

- Add menu bar reset status, latest reset detail, and history commands
