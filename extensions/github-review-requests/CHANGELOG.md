## [Update] - {PR_MERGE_DATE}

- Preserve personal and organization owner scopes across both menu layouts, and honor Search Everywhere after migration.
- List your own account alongside the organizations when choosing the owner scope, selected by default and removable.
- Refresh the menu bar automatically when a tracking setting changes, instead of waiting for Force Refresh.
- Keep a section for every owner in scope, and a steady menu height, so a background refresh cannot move a row under a click.
- Build the ignore list from the accounts actually opening pull requests in your scope, grouped by owner.
- Show every open pull request in the repositories you watch — your own account's by default — grouped separately from your review requests.
- Preserve the original GitHub icon, search, review-status menu, and PAT support.
- Add optional GitHub CLI authentication across all commands.
- Add conversation reply tracking, ageing, filters, an optional attention menu, and an activity inbox.
- Keep scheduled tracking and desktop notifications off by default.

# Snake Changelog

## [Maintenance] - 2026-06-23

- Update dependencies to their latest versions (Raycast API, Octokit, GraphQL Request, GraphQL Code Generator, and types).
- Migrate ESLint to `@raycast/eslint-config` with the flat config format.
- Regenerate GraphQL types for `graphql-request` v7.

## [New Additions & Fixes] - 2024-03-18

- Add subtitle for menu bar item to improve readability.
- Fix counting issue of Wait For Review category.

## [Update] - 2024-03-17

- Add README file for readers.

## [New Additions & Refactor] - 2024-03-14

- Menubar: Reorganize menu item order.
- Menubar: Divide all PRs into 4 parts: Wait For Merge, Wait For Change, Wait For Review and New Review Requests.
- Preferences: Allow users to filter specific organizations/owners.
- Filter out draft PRs for all commands.

## [Update] - 2022-09-12

- Menubar; item now hides PR immediately after clicking on it
- Menubar; Added hotkeys to navigate through items (⌘+1-9);
- Menubar; Added a force-refresh option.
