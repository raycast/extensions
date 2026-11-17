# Graphite

Your [Graphite](https://graphite.com) pull request inbox in Raycast. Read pull requests, approve, comment, and merge stacks, or ask Raycast AI what needs your attention.

## Setup

1. Install the [Graphite CLI](https://graphite.com/docs/install-the-cli) with `brew install withgraphite/tap/graphite`, then sign in with `gt auth --token <token>` using a token from [app.graphite.com/activate](https://app.graphite.com/activate).
2. Install the [GitHub CLI](https://cli.github.com) with `brew install gh`, then sign in with `gh auth login`. You need it for reviews, comments, checks, and merging.

If Raycast can't find `gt` or `gh`, set its path in the extension preferences.

## Pull Request Inbox

Shows your Graphite inbox sections, such as "Needs your review" and "Returned to you", with review status, unresolved comments, CI checks, and merge readiness for each pull request.

- **Configure Sections** (`⌘⇧S`) hides or reorders sections. Create new ones in Graphite.
- **Show Pull Request** (`↵`) opens the description, unresolved comments, and reviews. `⌘I` toggles a side panel.
- **Approve** (`⌘⇧A`), **Request Changes** (`⌘⇧X`), and **Comment** (`⌘⇧K`) post reviews to GitHub.
- **Merge with Graphite** (`⌘⇧↵`) works like Graphite's Merge button: it merges the stack up to the selected pull request, through the merge queue if your repository uses one.
- **Check out Locally** (`⌘⇧G`) runs `gt get` in your local clone. Set **Repository Folders** if your code isn't in a common folder like `~/code`.

Press `⌘K` for all actions and shortcuts.

## Inbox Menu Bar

Shows your inbox and the number of pull requests waiting on you. Turn it on in Raycast Settings → Extensions → Graphite.

## Raycast AI

Mention `@graphite` in AI Chat or Quick AI:

- "@graphite what needs my review?"
- "@graphite summarize the unresolved comments on my billing PR"
- "@graphite approve acme/web#482"
- "@graphite merge acme/web#482"

Raycast asks you to confirm before anything is posted or merged. Requires [Raycast Pro](https://www.raycast.com/pro).

## Privacy

Graphite has no public API. Like Graphite's own menu bar app, the extension uses the token saved by `gt auth` and sends it only to Graphite. These endpoints aren't documented, so they could change. GitHub requests go through your own `gh` login; the extension never stores a GitHub token.
