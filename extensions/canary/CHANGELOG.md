# PR Canary Changelog

## [Canary in PR Description] - {PR_MERGE_DATE}

- Read the canary URL from the PR description, where CI may now post it, before falling back to PR comments
- Recognize markdown links labelled Canary, e.g. `[SaaS Canary](…)`
- Find the canary's commit file under a path-based canary, e.g. `/pr-123/build-info.json`, by trying each folder of the canary URL
- Color the canary tag orange when its commit can't be read, instead of green

## [Red Tag on 403] - 2026-11-22

- Color the canary tag red when the canary refuses the commit check with a 403

## [Latest Commit Check] - 2026-11-16

- Show each pull request's latest commit instead of its number (the number still works in the filter)
- Color the canary tag yellow when the canary doesn't run the latest commit, read from the canary's `/build-info.json`
- Show the pull requests right away; canary checks fill in afterwards and skip local and private-network addresses
- Show a repeated GitHub error once instead of once per pull request
- Make the icon's corners transparent

## [Initial Version] - 2026-10-12

- List your open pull requests and open the preview (canary) URL posted by CI in a PR comment
- Copy the URL, open the pull request, or open an optional extra link (e.g. a deploy dashboard)
