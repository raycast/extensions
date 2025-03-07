# Github Small PRs Checker

Monitor and quickly review small pull requests across multiple GitHub repositories.

## Features

- Automatically checks for small PRs every 5 minutes
- Lists PRs in two categories: New and Seen
- Search PRs by title or author
- Configurable PR size limit
- Configurable PR age limit
- No GitHub token needed (uses Git credentials)

## Configuration

### Required Setup

1. Make sure you have Git credentials configured for GitHub
2. Add the repositories you want to monitor to the `repositories` preference.

### Optional Setup

1. Configure the `maxLines` preference to set the maximum number of lines of code a PR can have to be considered small.
2. Configure the `maxAgeDays` preference to set the maximum age of a PR to be considered small.
3. Configure the `ignorePatterns` preference to set the patterns of files to not count towards the total changes.

## Usage

1. Run the command `Check For Small PRs` to check for small PRs. (This will also run in the background every 5 minutes). PRs will be cached for 1 hour and visible in the list view.
2. Run the command `List Small PRs` to see a list of small PRs.

PRs are considered "small" if:

- They have fewer lines changed than the configured maximum
- They are not draft PRs
- They are not older than the configured maximum age
- They are open

## Tips

- PRs move to the "Seen" category once you open them
- PRs are listed in descending order of creation date
