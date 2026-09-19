# GHBar Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Pull requests and issues other people opened on your repositories, in the menu bar
- Five sections in urgency order: Changes Requested, Review Requested, Pull Requests, Issues, My Pull Requests — an item claimed by a stronger signal never repeats in a weaker one
- Unread items are green and counted in the menu bar; clicking one opens it and marks it seen
- A repository with more than three open items collapses into one submenu instead of flooding the list
- Bots (Dependabot and friends) are filtered out by default
- Failures are never shown as an empty list: errors get their own row and stale data says how stale it is
- One GraphQL request per refresh, measured at 1 rate-limit point
