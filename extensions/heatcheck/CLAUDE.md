# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A Raycast extension (macOS) that shows what's burning your CPU and spinning your fan.

## Commands

```bash
npm run dev       # ray develop — hot-reload into the local Raycast app
npm run build     # ray build — production build
npm run check     # typecheck + lint — run this as the gate before committing
npm run typecheck # tsc --noEmit
npm run lint      # ray lint
npm run fix-lint  # ray lint --fix
```

This is an **npm** project, not pnpm. Raycast's store tooling requires a `package-lock.json` (the `raycast/extensions` monorepo runs on npm), so the lockfile must stay npm's — `ray publish` rejects an extension without it.

There is no test suite. `ray build`/`ray develop` transpile with esbuild and do **not** typecheck — type errors slip through the build. Run `npm run check` (or `npm run typecheck`) to catch them; that is the real gate. ESLint config is `@raycast/eslint-config` (re-exported from `eslint.config.js`).

`raycast-env.d.ts` is auto-generated from `package.json` — never edit it by hand. To add a command or a preference, edit the `commands` array in `package.json` and the file regenerates on the next `ray` run.

## Architecture

Two Raycast `view` commands, each backed by one `.tsx` file whose name matches the command `name` in `package.json` and whose **default export** is the React component:

- `src/heat-check.tsx` — `heat-check` command. A verdict-first `List`: a hero line stating what's going on, then a **Temperatures** section (CPU max + die avg, GPU, SSD, battery — null rows hidden), a **System** section (one row per physical fan with RPM and % of its own rated max, CPU load, power/charging, memory pressure), and top processes, with kill/copy actions and a 4-second auto-refresh (an in-flight guard skips a tick rather than stacking overlapping collections). Each row colors by **its own** metric (`tempColor`/`loadColor`/`fanColor`), staying neutral until elevated; only the hero badge carries the overall verdict color. The palette skips yellow (poor light-mode contrast): green → blue → orange → red.
- `src/diagnosis.tsx` — `diagnosis` command. Collects the same snapshot, then feeds it (plus the verdict) to Raycast AI (`AI.ask`) for a plain-English explanation. **Requires Raycast Pro.**

`src/system.ts` is the shared data layer — both commands import from it. It owns every shell-out, all the types (`SystemSnapshot`, `TempReadings`, `FanReading`, `Verdict`, `HeatCause`, `ProcessStat`, the level/pressure unions), and the verdict logic. It emits no JSX. Two halves:

- `collectSnapshot()` → `SystemSnapshot`: pure measurements, no judgement. Temperatures live in a `temps: TempReadings` (`cpuMaxC`/`cpuAvgC`/`gpuC`/`ssdC`/`batteryC`, any nullable); fans in `fans: FanReading[]` (one `{ rpm, maxRpm }` per physical fan).
- `buildVerdict(snap)` → `Verdict` (`{ level, cause, headline, detail }`): the computed read. `level` is the ordered union `cool < busy < warm < hot`. The headline is generated from the attributed `cause` (`cpu` hog | `busy` | `charging` | `ambient` | `none`), so a process not using meaningful CPU can never read as "overloading".

Data sources (`execa` shell-outs unless noted):

- `ps -Ao pid=,pcpu=,rss=,args= -r` → top processes (fast point-in-time snapshot, ~100ms vs ~2s for `top -l 2`). Process name is parsed out of the full `args` column — the parser splits the exe path from flags at the first `" -"`. `pcpu` is summed across cores, so it's divided by `os.cpus().length` to a 0–100% machine share.
- `os.loadavg()` (no shell-out) → machine-wide 1-minute load, reported as `loadPct` (% of cores).
- `memory_pressure` → memory-pressure level (string-matched).
- `pmset -g ps` → power source and charging state (charging matched with a `not`-excluding lookbehind).
- `iSMC temp -o json` / `iSMC fans -o json` → all displayed temps (CPU max/avg, GPU, SSD, battery) and per-fan current/rated-max RPM, parsed from JSON.

**iSMC (`dkorunic/iSMC`) is a GPL-3.0 sensor CLI we download, never bundle.** `src/ismc.ts` owns acquisition: on first run it fetches a pinned universal release tarball from the project's GitHub (a server we don't control), verifies it against a SHA256 hash hardcoded in source, extracts just the binary, and caches it at `<environment.supportPath>/bin/iSMC-<version>`. The binary ships ad-hoc signed (runs on Apple Silicon) and is fetched over the network (no quarantine xattr → no Gatekeeper prompt); we invoke it as a separate process. Bumping the version means changing `VERSION` + `TARBALL_SHA256` together — the version is in the cache filename, so a bump self-invalidates.

When the download fails (offline first run) or sensors are unreadable, `getSensorData` returns an all-`null` `temps` and an empty `fans` array with `sensorsAvailable: false`; the UI degrades gracefully. Sensor selection is parser-side: `parseFans` groups readings by fan index `<n>`, pairing the actual-speed key (`F<n>Ac`) with that same fan's rated-max key (`F<n>Mx`) so each fan's effort is a share of its own ceiling. Temps come from friendly sensor names: `cpuMaxC` tiers from decoded `CPU …` sensors → Apple Silicon `tdie` → hottest plausible sensor, while `cpuAvgC`/`gpuC`/`ssdC`/`batteryC` are the hottest sensor matching `CPU Die Average` / `GPU <n>` / `SSD <n>` / `Battery <n>` (Apple Silicon naming — an unrecognised chip yields null and the row hides). Treat the `ps`/`memory_pressure`/`pmset`/iSMC-JSON formats as load-bearing — the parsers depend on their exact columns, labels, and SMC key conventions.

The verdict deliberately does **not** alarm on temperature alone: Apple Silicon runs 90–100°C under load by design. `buildVerdict` computes a three-state thermal axis (`none`/`warm`/`hot`) from fan effort (≥70% / ≥85% of rated max) and `cpuMaxC` (≥85°C / ≥95°C), and a compute axis from a single-process hog (≥60% of the machine) or total load (≥50%). Heat outranks compute — a climbing fan reads `warm` over a cool-but-busy machine — giving the ordered level `cool < busy < warm < hot`. The `warm` band keeps the badge from snapping straight cool→hot. OS-true throttle detection is absent on purpose — `pmset -g therm` is dead on Apple Silicon (verified under full load), and the real signal (`ProcessInfo.thermalState`) needs a compiled helper, tracked in beads.

Process termination uses Node's `process.kill(pid, signal)` directly (SIGTERM / SIGKILL), not a shell `kill`.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
