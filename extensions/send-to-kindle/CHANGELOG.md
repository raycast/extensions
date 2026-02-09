# Send to Kindle Changelog

## [Skills and Preview Improvements] - {PR_MERGE_DATE}

- Added guided cover skill creator action in the Preview and Send to Kindle command
- Added the guided filter skill creator action in the Preview and Send to Kindle command
- Added metadata view in the Preview and Send to Kindle command
- Added the View Cover action in the Preview and Send to Kindle command
- Added send to Kindle history, to see previously sent articles
- Skills are now unique per domain: adding a skill for an existing domain updates that domain entry instead of creating a new skill.
- When adding a skill to an existing domain, CSS selectors are merged with the existing selectors (without duplicates) instead of overwriting them.
- Improved direct-send (no preview) feedback: the delivery flow now keeps an animated toast and transitions to an explicit success toast.
- Added a `Copy Original Source Code` action in `Preview and Send to Kindle` to copy the full original page HTML. This is useful when prompting an AI to identify a CSS selector you can later add as a skill to remove recurring unwanted elements on that site.

## [Initial Version] - {PR_MERGE_DATE}
