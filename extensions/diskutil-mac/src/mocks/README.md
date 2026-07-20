# Diskutil Mock Layer

A drop-in replacement for `diskutil` so you can reproduce production scenarios
(70+ disks, slow HDDs, timeouts, libuv-style queueing) without touching real
hardware. **Excluded from production builds entirely** — see below.

## TL;DR

```bash
npm run dev                       # real diskutil
npm run dev:mock                  # use scenario from mockConfig.json
npm run dev:mock 4                # scenario 4 by number
npm run dev:mock hdd_heavy        # scenario by name
npm run dev:mock 15               # the production bug repro (libuv-pool sim)

npm run mock 4                    # set the override but don't launch ray develop
npm run mock off                  # disable the mock layer
npm run mock:ls                   # show the numbered scenario list

npm run build                     # build for production (mock stripped out)
```

## Workflow

Two pieces of state move together, both flipped by `apply-mock.sh`:

- **`src/utils/mockBridge.ts`** — committed as a stub. When mock is enabled,
  rewritten in place to re-export from the real mock module. This is what
  decides whether the bundler sees the mock layer at all.
- **`src/mocks/mockOverride.json`** — committed as `{}`. When mock is enabled,
  rewritten with `{ enabled: true, scenario: …, logCalls: … }`. Layered over
  `mockConfig.json` at runtime to pick the active scenario.

Both files appear modified in `git status` while a mock scenario is active.
That's intentional — visible state beats hidden state. `npm run publish`
always resets them to the off state before invoking `ray publish`, so the
shipped bundle is built from clean source regardless of the dev state.

## Why config-via-file (not env vars)

A Raycast extension is **bundled** by `ray develop` and then **run inside the
Raycast app** — not as a child of `npm run …`. Environment variables set in
the npm script reach the build process but **don't reach the running
extension**. So config has to be inside the bundle. The override JSON
gets imported by `mockDiskutil.ts`, baked into the build, and reaches the
running extension that way.

(Env vars `MOCK` / `MOCK_SCENARIO` / `MOCK_LOG` still work as a third config
layer for CI or custom launchers where the env _does_ reach the extension.)

## How it works

```
┌──────────────────────────────────────────┐
│ Disk.init() / DiskSection.initDisks() …  │  ← unchanged
└────────────────┬─────────────────────────┘
                 │ execDiskCommand("diskutil ...")
                 ▼
        ┌───────────────────┐    enabled?     ┌─────────────────┐
        │ execDiskCommand   │────yes─────────▶│   mockExec()    │
        └───────────────────┘                 └──────┬──────────┘
                 │ no                                │
                 ▼                                   ▼
        ┌───────────────────┐               ┌─────────────────┐
        │ child_process exec│               │  topology +     │
        └───────────────────┘               │  fixtures + RNG │
                                            └─────────────────┘
```

All production code paths are unchanged. The hook is a single line in
[`../utils/diskUtils.tsx`](../utils/diskUtils.tsx):

```ts
if (isMockEnabled()) return mockExec(command);
```

…and that import goes through [`mockBridge.ts`](../utils/mockBridge.ts), not
directly into `mocks/`, which lets prod builds strip the mock layer wholesale.

## Files

| File                                                         | Purpose                                                                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| [`mockConfig.json`](./mockConfig.json)                       | Committed baseline config.                                                                                                   |
| [`mockOverride.json`](./mockOverride.json)                   | Per-run override written by `npm run mock …`.                                                                                |
| [`scenarios.ts`](./scenarios.ts)                             | Named presets + the stable numbered list.                                                                                    |
| [`mockDiskutil.ts`](./mockDiskutil.ts)                       | `mockExec(command)` + `isMockEnabled()`.                                                                                     |
| [`topology.ts`](./topology.ts)                               | Synthesizes sections + disks.                                                                                                |
| [`fixtures.ts`](./fixtures.ts)                               | Plist XML + plain-text templates.                                                                                            |
| [`rng.ts`](./rng.ts)                                         | Seeded PRNG so the same disk always behaves the same.                                                                        |
| [`types.ts`](./types.ts)                                     | TypeScript types for the config.                                                                                             |
| [`../utils/mockBridge.ts`](../utils/mockBridge.ts)           | Bridge between prod code and the mock layer. Committed as a stub; rewritten to a re-export by `apply-mock.sh` when enabling. |
| [`../../scripts/apply-mock.sh`](../../scripts/apply-mock.sh) | Rewrites both `mockBridge.ts` and `mockOverride.json`; can spawn `ray develop`.                                              |

## Config reference

```jsonc
{
  // Master switch. false ⇒ entire mock layer is bypassed.
  "enabled": false,
  // Optional preset name. When set, the preset's fields override the inline
  // values below. null ⇒ use the inline values as-is.
  "scenario": null,
  "diskCount": 12,
  "sectionCount": 3,
  // Per-disk latency distribution for `diskutil info` calls.
  "latency": {
    "fast": { "weight": 8, "range": { "minMs": 20, "maxMs": 80 } },
    "slow": { "weight": 2, "range": { "minMs": 200, "maxMs": 800 } },
    "stall": { "weight": 0, "range": { "minMs": 6000, "maxMs": 9000 } },
  },
  "listLatency": { "minMs": 30, "maxMs": 60 },
  "actionLatency": { "minMs": 50, "maxMs": 150 },
  "errorFraction": 0,
  "seed": 42,
  "logCalls": false,
  // Optional: simulate libuv thread-pool contention. Without this, 150 fake
  // disks all run their setTimeouts in parallel, which is NOT how the real
  // bug looks. Set to 4 to mimic Node's default UV_THREADPOOL_SIZE.
  "pool": 0,
}
```

## Built-in scenarios

Run `npm run mock:ls` for the live list. Highlights:

| #   | Scenario                  | Disks | What it tests                                                                                                                                                                                |
| --- | ------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3   | `stress_70`               | 70    | Throughput with no stalls or pool cap.                                                                                                                                                       |
| 4   | `stress_70_with_timeouts` | 70    | ~10 % of disks stall > 5 s.                                                                                                                                                                  |
| 15  | `stress_70_libuv`         | 70    | **The bug repro.** Fast individual calls, but `pool: 4` simulates libuv contention. Timeouts come from _queueing_, not from any single call being slow — the actual production failure mode. |
| 6   | `hdd_heavy`               | 30    | Long slow tail.                                                                                                                                                                              |
| 10  | `huge_150`                | 150   | Scaling headroom past 70.                                                                                                                                                                    |
| 11  | `slow_list`               | 10    | `diskutil list` itself is slow.                                                                                                                                                              |
| 12  | `errors_only`             | 10    | 100 % errors.                                                                                                                                                                                |
| 13  | `partial_outage`          | 40    | Stalls + errors combined.                                                                                                                                                                    |
| 14  | `realistic_macbook`       | 14    | Typical dev MBP.                                                                                                                                                                             |

Adding new scenarios: append to `SCENARIOS` in [`scenarios.ts`](./scenarios.ts)
and to `SCENARIO_LIST` (used by numeric refs). **Never reorder existing
entries** — that would change which scenario number resolves to what.

## Reproducing the production bug

```bash
npm run dev:mock 15      # = stress_70_libuv
```

With `pool: 4`, 140 concurrent `diskutil info` calls queue through 4 slots.
Individual calls aren't slow, but the calling code's 5 s timeout starts
when the Promise is created, so calls deep in the queue time out _without
ever running_. That matches the "full timeout on 70+ disks" report.

When you eventually add a semaphore on the caller side and re-run scenario
15, the timeouts should disappear because the caller's own concurrency cap
prevents the queue from building up against the simulated pool.

## Production builds

The shipped extension contains **zero** bytes of mock code. This is enforced
by the _committed_ state of the repository, not by build-time magic, which
matters because `ray publish` opens a PR on `raycast/extensions` and Raycast
rebuilds the extension server-side from that source.

How it works:

- **Committed `mockBridge.ts` is a stub** — no `import from "../mocks/..."`.
  With nothing reachable from the entry point into `src/mocks/`, esbuild
  drops the entire folder.
- **`npm run dev:mock` rewrites `mockBridge.ts`** in place to re-export from
  the real mock module. This change is visible in `git status` and can't be
  committed silently.
- **`npm run dev`, `npm run mock off`, `npm run build`, `npm run publish`**
  all rewrite `mockBridge.ts` back to the stub before doing their work. So
  the bundler always sees the clean source on any build/publish path.

Verify yourself at any time:

```bash
git stash               # or commit your work first
npm run build:local     # plain ray build, no mock-stripping wrappers
grep -c "stress_70\|mockDiskutil\|buildPlist\|SCENARIOS" ./build/index.js
# → 0
```
