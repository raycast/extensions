# Tembo Changelog

## [Cache menubar results, fetch in background, add missing code repo icons] - 2025-11-04

- Eliminate flickering from the menubar by caching API results
- Fetch new tasks from the API every 10 minutes in the background
- Reuse the cache between the view-tasks command, and the menubar command
- Fix how non-Github repositories were rendered, now adding Gitlab and Bitbucket icons

## [Improve menu bar listing, add Slack icon] - 2025-10-29

- Adds an icon for issues created from Slack
- Makes the task listing in the menubar no longer duplicate the issue source name

## [Improve task sorting and the menu bar revalidation] - 2025-09-29

- Updates the Tembo menu bar to now use useCachedPromise
- Changes the author to now be @tembo
- Improved sorting of tasks

## [Initial Version] - 2025-09-11
