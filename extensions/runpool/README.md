# Runpool

Manage on-demand self-hosted GitHub Actions runner pools on your Mac, from Raycast.

Requires the [`runpool`](https://github.com/aicayzer/runpool) command line tool:

```bash
brew install aicayzer/tap/runpool
```

The extension tells you how to install it if it is missing, so there is no harm in trying it first.

## What it does

**Runner Pools** lists every pool with what it is doing: resting, idle, building, or unreachable. From there you can start and stop a pool, change how many runners it has, pause everything, and open the log. Press return on a pool to see which repositories it serves, and open any of them on GitHub.

**Toggle Local CI** pauses every pool or resumes on-demand running, in one keystroke.

**Pool Status** keeps a live summary in its own subtitle in Raycast's root search, refreshed every minute. There is no menu bar item, by design.

## Reading the states

- **Resting** — no runners up. This is the normal state for an on-demand pool, not a fault. It wakes within about a minute of a job queueing.
- **Idle** — runners are up but nothing is running. They stand down on their own.
- **Building** — jobs are in flight.
- **Unreachable** — GitHub has no online runners for this pool, so jobs will queue against it forever. This is the one state worth acting on, and the extension offers to re-register the pool.

## AI

Ask Raycast AI things like "what are my runner pools doing", "stop the marfa pool", or "pause local CI". Anything that changes capacity asks first.

## Preferences

**runpool Executable** — only needed if `runpool` is installed somewhere unusual. Left empty, the extension looks in the standard locations.
