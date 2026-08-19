# RunPool

Manage on-demand self-hosted GitHub Actions runner pools on your Mac, from Raycast.

Requires the [`runpool`](https://github.com/aicayzer/runpool) command line tool:

```bash
brew install aicayzer/tap/runpool
```

The extension tells you how to install it if it is missing, so there is no harm in trying it first.

## Commands

**Show Runner Pools** lists every pool against its owner's GitHub avatar, with how many of its runner slots are busy. Start and stop a pool, change its runner count, disable local CI, and open the log. Press return to see which repositories a pool serves.

**Runner Status** keeps a live summary in its own subtitle in Raycast's root search, refreshed every minute.

**Runner Status in Menu Bar** is off by default. Turn it on and the menu bar shows the mark filled to the proportion of runner slots in use. Monochrome by default; there is a preference for the RunPool blue.

**Machine Load** is off by default. It reports the machine's load average against its core count, which is what tells you whether a failing test was the code or a contended machine.

## Reading it

Every pool shows **`2/4`**: jobs running out of total runner slots. The icon fills to the same fraction, so the picture and the number always agree.

The state tags use GitHub's own words, as shown on its runners settings page.

- **Active** — jobs running.
- **Idle** — runners connected, nothing running.
- **Offline** — no runners connected. For an on-demand pool this is the normal resting state, not a fault, and it is styled neutrally. It wakes within about a minute of a job queueing.
- **Unreachable** — GitHub has no online runners, so jobs will queue against this pool forever. The one state worth acting on, and the extension offers to re-register.

## AI

Ask Raycast AI things like "what are my runner pools doing", "stop the marfa pool", or "disable local CI". Anything that changes capacity asks first.

## Preferences

**Executable Path** — only if `runpool` is installed somewhere unusual. Left empty, the extension looks in the standard locations.
