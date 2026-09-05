# GHBar

**Pull requests and issues other people opened on your repositories, in the menu bar.**

GitHub's notification inbox mixes everything together: a comment on your own PR,
a thread you subscribed to once, a CI result. The one signal that actually needs
you — *somebody sent a contribution to my repository* — gets lost in it.

GHBar shows only that signal.

This is a Raycast port of [cobanov/ghbar](https://github.com/cobanov/ghbar), a
macOS menu bar app by [Mert Cobanov](https://github.com/cobanov).

## What you get

| | |
| --- | --- |
| **Only what's yours** | Pull requests and issues **other people** opened on your repositories, plus PRs waiting on your review |
| **Urgency order** | Changes Requested → Review Requested → Pull Requests → Issues → My Pull Requests. An item claimed by a stronger signal never repeats in a weaker one |
| **Unread at a glance** | New items are green, seen ones fade — the count sits in the menu bar |
| **Noisy repo? Folded** | A repository with more than three open items collapses into one submenu instead of flooding the list |
| **Bots stay out** | Dependabot and friends are filtered by default |
| **Honest about failures** | If GHBar can't reach GitHub it says so, instead of showing an empty list you'd read as "nothing waiting" |
| **Costs one API point** | A single GraphQL query per refresh — 0.12% of your hourly quota at the ten-minute refresh interval |

## Signing in

GHBar signs in through Raycast's GitHub OAuth app — no token to create. If you
would rather use your own, paste a personal access token into the command's
preferences instead.

By default GHBar requests the `repo` scope so private repositories are searched
too. Turn off **Include private repositories** in preferences to narrow that to
`public_repo`.

## Preferences

| | |
| --- | --- |
| **Sections** | Turn any of the five sections off. Hiding a section does not swallow its items — a pull request hidden from Changes Requested falls through to My Pull Requests instead of disappearing |
| **Filters** | Show or hide draft pull requests and bots |
| **Watched Accounts** | Comma-separated logins whose repositories to watch. `@me` is you |
| **Organizations** | Comma-separated organization logins. When set, GHBar shows work **assigned to you** inside those organizations and the watched accounts are ignored — GitHub search ANDs `user:` with `org:` and would always return nothing |
| **Repository Filter** | Off, "only these repositories", or "everything except these". While it is off the repository list is ignored entirely, so turning the filter off really does widen the results |
| **Group Noisy Repositories** | The item count above which a repository collapses into one submenu |
| **Rows per Section** | How many rows a section shows before the rest move into a `more…` submenu |
| **Rate Limit Row** | Never, only when low, or always |

## How it works

One GraphQL request per refresh covers five searches, your profile and the
rate-limit status:

```
is:pr    is:open author:@me review:changes_requested  → Changes Requested
is:pr    is:open review-requested:@me                 → Review Requested
is:pr    is:open user:@me -author:@me                 → Pull Requests
is:issue is:open user:@me -author:@me                 → Issues
is:pr    is:open author:@me                           → My Pull Requests
```

Everything else is local: filtering, grouping and the record of what you've
already seen. GHBar has no server and no telemetry.

Refreshes happen every ten minutes in the background, and on demand from the
**Refresh** item in the menu.

## Development

```bash
npm install
npm run dev      # open in Raycast development mode
npm test         # pure-core tests (no Raycast needed)
npm run lint
```

`src/core/` imports no Raycast API. Query building, response parsing,
filtering, grouping and the seen state all live there and are tested without
running Raycast.

`tools/makeicon.py` regenerates the icons; `tools/makeshot.py` brings Store
screenshots to the required 2000×1250.

## Credits

Original macOS app and its design decisions: [cobanov/ghbar](https://github.com/cobanov/ghbar) (MIT).

GHBar is an independent open-source project. It is not affiliated with,
endorsed by or sponsored by GitHub, Inc.
