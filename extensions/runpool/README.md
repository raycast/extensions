# Runpool

Manage on-demand self-hosted GitHub Actions runner pools on your Mac, from Raycast.

Requires the [`runpool`](https://github.com/aicayzer/runpool) command line tool:

```bash
brew install aicayzer/tap/runpool
```

The extension tells you how to install it if it is missing, so there is no harm in trying it first.

## What it does

**Show Runner Pools** lists every pool against its owner's GitHub avatar, with what it is doing. From there you can start and stop a pool, change how many runners it has, disable local CI entirely, and open the log. Press return on a pool to see which repositories it serves.

**Runner Pool Status** keeps a live summary in its own subtitle in Raycast's root search, refreshed every minute.

**Runner Pools in Menu Bar** is off by default. Turn it on and the menu bar shows the mark filled to the proportion of runners that are awake: empty when nothing is running, full when everything is.

## Reading the states

The words are GitHub's own, as shown on its runners settings page.

- **Offline** — no runners connected. For an on-demand pool this is the normal resting state rather than a fault, and it is styled neutrally for that reason. It wakes within about a minute of a job queueing.
- **Idle** — runners are connected but nothing is running. They stand down on their own.
- **Active** — jobs are in flight, with the count.
- **Not registered** — GitHub has no runners for this pool, so jobs will queue against it forever. This is the one state worth acting on, and the extension offers to re-register.

## AI

Ask Raycast AI things like "what are my runner pools doing", "stop the marfa pool", or "pause local CI". Anything that changes capacity asks first.

## Preferences

**runpool Executable** — only needed if `runpool` is installed somewhere unusual. Left empty, the extension looks in the standard locations.
