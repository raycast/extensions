# RunPool

Manage on-demand self-hosted GitHub Actions runner pools on your Mac, from Raycast.

## Requirements

Two command line tools, neither bundled:

```bash
brew install aicayzer/tap/runpool
brew install gh && gh auth login
```

[`runpool`](https://github.com/aicayzer/runpool) is what this extension drives, version 0.9.0 or newer. Older versions are refused rather than tolerated: `set-count --if-count` arrived in 0.9.0 and older ones ignore the flag instead of rejecting it, so a resize would look guarded here and not be, and a pool changed from another window at the same moment gets shrunk by an action meant to grow it. The [GitHub CLI](https://cli.github.com) is what `runpool` registers and deregisters runners through, and what this extension reads workflow history through, so an unauthenticated `gh` is not a partial setup — it is no setup at all.

The extension tells you which one is missing and how to fix it, so there is no harm in trying it first.

## Commands

**Show Runner Pools** lists every pool against its owner's GitHub avatar, with how many of its runner slots are busy. Start and stop a pool, pause or resume one pool, and open the log. Press return to see which repositories a pool serves. Capacity is one step up or one step down, with **Set Runner Count…** for anything else, and shrinking a pool asks first because the surplus runners are deregistered from GitHub rather than stopped.

**Show Recent Workflow Runs** lists recent GitHub Actions workflow runs across the repositories your pools serve. It shows the pull request or branch, when the workflow was triggered, its result and a compact runner summary, including RunPool hosts, Blacksmith and GitHub. Press return to see the workflow's individual jobs, with each job's duration and runner, then open a job, pull request or the whole workflow on GitHub. Scroll to load older runs.

**Manage Runner Pools** pauses or resumes automatic RunPool runners. Pausing stands its runners down and prevents them waking for queued work; it does not affect Blacksmith or GitHub workflows.

**Runner Status** keeps a live summary in its own subtitle in Raycast's root search, refreshed every minute.

**Runner Status in Menu Bar** is off by default. Turn it on and the menu bar shows the mark filled to the proportion of runner slots in use. Monochrome by default; there is a preference for the RunPool blue.

## Reading it

Every pool shows **`2/4`**: jobs running out of total runner slots. The icon fills to the same fraction, so the picture and the number always agree.

The state tags use GitHub's own words, as shown on its runners settings page.

- **Active** — jobs running.
- **Idle** — runners connected, nothing running.
- **Offline** — no runners connected. For an on-demand pool this is the normal resting state, not a fault, and it is styled neutrally. It wakes within about a minute of a job queueing.
- **Unreachable** — GitHub has no online runners, so jobs will queue against this pool forever. The one state worth acting on, and the extension offers to re-register. Detecting it needs an authenticated `gh`; when GitHub cannot be asked the list says so rather than reporting every pool as healthy.
- **Paused** — this pool is intentionally paused and will not start or wake until it is resumed. **Paused Globally** means Manage Runner Pools has paused every pool.

## AI

Ask Raycast AI things like "what are my runner pools doing", "stop the marfa pool", "pause the marfa pool", or "pause runner pools". Pool and global pauses are separate; anything that changes state asks first.

## Preferences

**Executable Path** — only if `runpool` is installed somewhere unusual. Left empty, the extension looks in the standard locations.
