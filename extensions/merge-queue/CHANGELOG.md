# Merge Queue Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Merge Queue: every entry in order with its state, required-check progress, ETA, and failing checks; filter to yours or the ones that need attention
- Checks in two columns: every check on the left, failed first, then running, then finished, a preview of the selected failure on the right with errors linked to the file and line, failed and flaky tests, and the log around the error
- Finds errors in any CI log without knowing the framework: scores the failed step's lines, compares them with the last passing run of the same job, and collapses what both runs printed
- Names failed tests for Jest, Vitest, Playwright, pytest, Go, RSpec, Cargo, Gradle and .NET
- Links straight to the failing line of the log on GitHub
- Full report per job with the failed step, errors, tests and log; copy a failure summary with links to paste into chat
- Rerun failed jobs or a single job, with a confirmation first
- Merge Queue Menu Bar: your position and state, refreshed every minute
- Remembers your repository and opens straight to its queue; picks it for you the first time when there's only one likely queue
- Switch repositories from the search bar dropdown or the full picker
- Pick a repository in the command: your queued pull requests' repositories and your active ones with a merge queue come first, or search all of GitHub by recent pushes, stars, or best match
- Detects the queue's branch from the default branch, rulesets, or your queued pull requests
- Reads through the GitHub CLI, with nothing to configure
- Signing in to gh from Raycast: when gh isn't installed, isn't signed in, has an expired sign-in, or needs single sign-on authorized for an organization, one action opens Terminal with the right command (or GitHub's authorization page), and the extension retries every few seconds until it works
- Plain-language errors with a fix for each: install or sign in to gh, a repository you can't see, one without a merge queue (choose another or enter its branch), offline, and rate limits
