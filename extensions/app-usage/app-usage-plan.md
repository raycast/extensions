# App Usage — Raycast Extension Plan

A Raycast extension that passively records which applications you use and for how long,
then shows you where your day actually went. Fully local, no network, no account.

**Status:** planning
**Target platform:** macOS only
**External dependencies:** none (no API key, no CLI, no bundled binary, no network calls)

---

## Table of contents

1. [Name](#1-name)
2. [Why this extension should exist](#2-why-this-extension-should-exist)
3. [Verified feasibility](#3-verified-feasibility)
4. [Hard constraints and risks](#4-hard-constraints-and-risks)
5. [Architecture](#5-architecture)
6. [The sampling algorithm](#6-the-sampling-algorithm)
7. [Idle detection](#7-idle-detection)
8. [Data model and storage](#8-data-model-and-storage)
9. [Commands](#9-commands)
10. [UI design](#10-ui-design)
11. [Privacy](#11-privacy)
12. [macOS notes](#12-macos-notes)
13. [Manifest sketch](#13-manifest-sketch)
14. [Milestones](#14-milestones)
15. [Store submission checklist](#15-store-submission-checklist)
16. [Deferred to v2+](#16-deferred-to-v2)
17. [Open questions](#17-open-questions)
18. [References](#18-references)

---

## 1. Name

**Chosen: `App Usage`**

| Field | Value |
| --- | --- |
| `name` (manifest) | `app-usage` |
| `title` (manifest) | `App Usage` |
| Store URL | `raycast.com/<author>/app-usage` |

### Rationale

- Describes exactly what it does, which is what store search rewards.
- Matches the words people actually type when looking for this.

### Rejected alternatives

| Name | Why not |
| --- | --- |
| `Screen Time` | Apple ships a system feature under this exact name. Avoid the collision, especially now that Screen Time is the main competitor. |
| `Time Spent` | Vaguer, and collides conceptually with time-tracking extensions. |
| `Tally` | Brandable but undiscoverable. Nobody searches for it. |

### Keywords

```
screen time, usage, tracking, productivity, focus, time, activity,
app usage, digital wellbeing, statistics, report, analytics
```

---

## 2. Why this extension should exist

Verified against the live Raycast store API during planning:

- Searches for `screen time` and `app usage` return **no digital wellbeing extension**.
  The category is completely empty.
- No open PR in `raycast/extensions` matches `screen time`, `app usage`, `usage tracker`
  or `activity tracker` in the title. Nothing is in flight.
- Adjacent demand is proven: Pomodoro 107,053 downloads, Time Tracking 4,596,
  Clockify 4,459. People clearly care about their time. Nobody has built the passive
  version that requires zero input.

### The real competitor is macOS Screen Time

Going macOS-only means Apple's built-in Screen Time is the benchmark, and it is free,
system-level, and already installed. Be honest about the trade in both directions:

| | macOS Screen Time | App Usage |
| --- | --- | --- |
| Access | Several clicks into System Settings | Two keystrokes from anywhere |
| Granularity | Daily and weekly charts | Per-hour timeline: what was I doing at 3pm |
| Export | None | CSV and Markdown |
| Glanceability | None | Menu bar, always visible |
| Accuracy | System-level, always on | Sampled once a minute, only while Raycast runs |
| Scope | Syncs across your Apple devices | This machine only |

**Where App Usage genuinely wins:** speed of access, hourly resolution, export, and the
menu bar glance. **Where it genuinely loses:** absolute accuracy and cross-device scope.
The store description should lead with the first list and not pretend the second does not
exist. A tool that overstates its accuracy in this category loses trust permanently.

**Structural note.** Local system utilities are the highest-ceiling category on this store
(Kill Process, 723,735 downloads). This sits in that category.

---

## 3. Verified feasibility

Everything below was confirmed against the Raycast API docs and tested on macOS during
planning. This section exists so the plan does not rest on assumptions.

| Capability | Status | Detail |
| --- | --- | --- |
| Read frontmost app | **Confirmed** | `getFrontmostApplication(): Promise<Application>` in `@raycast/api`. Returns `name`, `path`, `bundleId`. |
| Run in background | **Confirmed** | `interval` on `no-view` and `menu-bar` commands. |
| Detect background launch | **Confirmed** | `environment.launchType` is `LaunchType.Background` or `LaunchType.UserInitiated`. |
| Persist data | **Confirmed** | `environment.supportPath` is a writable directory intended for extension data. |
| Menu bar | **Confirmed, and now available** | `MenuBarExtra`, macOS only. Unblocked by the platform decision. |
| Idle detection | **Tested here** | `ioreg -c IOHIDSystem` exposes `HIDIdleTime` in nanoseconds. Returned a correct value in **0.03s** with no permission prompt. |

### What does not work, and must be designed around

- **AppleScript is the wrong path for frontmost app.** Tested here:
  `osascript -e 'tell application "System Events" to get name of first application
  process whose frontmost is true'` **hung and failed** with
  `execution error: System Events got an error: AppleEvent timed out. (-1712)`.
  It is Automation-permission gated and can block for minutes. Use the native
  `getFrontmostApplication()` instead, which Raycast handles internally and which needs no
  permission prompt.
- **Docs conflict on the minimum interval.** The manifest reference says "The minimum
  value is 1 minute (`1m`)". The background refresh page says "The minimum value is 10
  seconds (`10s`)". **Design for `1m`**, which is the conservative reading and is
  sufficient here anyway.
- **Scheduling is approximate.** "macOS determines the best time for running the command
  in order to optimize energy consumption." Never assume a sample represents exactly one
  interval. Always compute real elapsed time from timestamps.
- **Menu bar space is not guaranteed.** macOS hides menu bar items when the bar is
  crowded. Keep the title short (a duration, not a sentence) and never rely on it being
  visible.

---

## 4. Hard constraints and risks

Stated up front because they shape every design decision that follows.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Sampling only happens while Raycast is running | Data has gaps | Raycast is menu-bar resident and effectively always on, but never claim completeness. Show "tracked 6h 12m today" so the number is honest about its own coverage. |
| Interval scheduling is imprecise | Naive sample-counting drifts | Compute elapsed time from stored timestamps, never from the nominal interval. |
| 1-minute granularity | Short app switches are missed | Statistically fine for daily aggregates. Say "sampled once a minute" in the README rather than implying exactness. |
| Machine sleeps or Raycast restarts | A single huge bogus attribution | Clamp elapsed time to `MAX_GAP`. See [the algorithm](#6-the-sampling-algorithm). |
| User walks away with an app focused | Massively inflated totals | Idle subtraction. This is not optional; without it the product is useless. |
| Passive behavioural recording | Store review scrutiny | Local-only, zero network, app names only, never window titles. Be loud about it. See [Privacy](#11-privacy). |
| Competing with a free system feature | Weak reason to install | Lead on speed, hourly resolution, export and glanceability. Never on accuracy. |

**The single biggest product risk is accuracy.** A tracker that says you used Chrome for
nine hours because you went to lunch is worse than no tracker. Idle handling is the
feature, not a detail.

---

## 5. Architecture

Core principle: **all logic lives in pure modules with no Raycast imports.** Commands are
thin wrappers. This makes the accuracy logic unit-testable without a Raycast runtime,
which matters more here than in most extensions because the correctness of the whole
product lives in about forty lines of arithmetic.

```
src/
  collect.ts                # no-view background command — the sampler, thin wrapper
  usage-report.tsx          # view command — thin wrapper
  usage-menu-bar.tsx        # menu-bar command — read-only, thin wrapper

  core/
    sampler.ts              # the tick: read state, attribute time, write state
    idle.ts                 # HIDIdleTime via ioreg
    store.ts                # read/write day files, atomic writes, pruning
    aggregate.ts            # roll day files into ranges (today, 7d, 30d)
    format.ts               # duration formatting, percentage bars
    types.ts

  components/
    UsageList.tsx
    AppDetail.tsx
    EmptyState.tsx
```

`core/sampler.ts` takes the frontmost app and the idle seconds as **arguments**, so it can
be unit-tested with no Raycast runtime and no OS calls:

```ts
export function tick(
  now: number,
  current: { key: string; name: string } | null,
  idleSeconds: number,
  state: SamplerState | null,
  opts: { maxGapMs: number },
): { attribution: Attribution | null; nextState: SamplerState };
```

### The sampler must never depend on the menu bar

`collect` (the `no-view` sampler) and `usage-menu-bar` are **separate commands on
separate intervals**. Do not merge them into a single `menu-bar` command that both samples
and renders, however tempting the simplicity is. Users disable menu bar commands to reduce
clutter, and if sampling were coupled to display, a cosmetic preference would silently
kill the entire product. The menu bar command is strictly a reader.

---

## 6. The sampling algorithm

This is the core of the extension. Everything else is presentation.

On each background run at time `T`:

```
1. app   = await getFrontmostApplication()
2. idle  = getIdleSeconds()            // ioreg
3. state = readState()                 // { lastAt, lastKey, lastName }

4. if (state.lastAt) {
     elapsed = min(T - state.lastAt, MAX_GAP)
     active  = max(0, elapsed - idleMs)
     if (active > 0 && state.lastKey && !isExcluded(state.lastKey)) {
       attribute(active, state.lastKey, hourBucket(state.lastAt))
     }
   }

5. writeState({ lastAt: T, lastKey: key(app), lastName: app.name })
```

### Why elapsed time is attributed to the *previous* sample's app

At time `state.lastAt` we observed app A. At time `T` we observe app B. The interval
between them was most likely spent in A, since A is what we know was focused when the
window opened. Attributing to the previous observation is the standard approach for
interval sampling and is unbiased over a day.

### Why idle is *subtracted* rather than used as an on/off switch

`HIDIdleTime` at time `T` reports how long the user has been idle **ending at `T`**. So:

- If `idle >= elapsed`, the entire interval was idle. `active` becomes 0. Correct.
- If `idle < elapsed`, the user went idle partway through. `elapsed - idle` is exactly
  the active portion. Correct, and strictly better than a binary threshold.

This one line handles lunch breaks, meetings away from the desk, and overnight gracefully.

### Why `MAX_GAP` is still needed

Idle subtraction alone does not cover machine sleep. If the laptop sleeps for eight hours
and the user wakes it by moving the mouse, `idle` is near zero while `elapsed` is eight
hours. Clamping `elapsed` to `MAX_GAP` (suggest `2 x interval`, so 2 minutes) discards
the phantom time. Both guards are required; neither is sufficient alone.

### Excluded apps

Exclusion is applied at attribution time, not at read time, so excluded apps never touch
disk. This matters for privacy: if someone excludes a banking or medical app, no record
of it should exist at all.

---

## 7. Idle detection

Verified working on the planning machine:

```
ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print $NF; exit}'
```

Returns nanoseconds since the last HID input. Measured cost: **0.03s**. No permission
prompt, no Automation access, no Full Disk Access. Divide by `1e9` for seconds.

**Failure handling.** If the value is missing or unparseable, treat idle as `0`. That
fails towards recording rather than silently losing a day of data, which is the right
direction for a tracker. Log it once rather than on every tick.

**Screen lock** is largely covered already, since locking the screen means no HID input and
`HIDIdleTime` climbs normally. A dedicated lock check via
`ioreg -n Root -d1 -a` (`CGSSessionScreenIsLocked`) is available if M1's real-day run
shows lock periods leaking through, but do not add it speculatively.

---

## 8. Data model and storage

All data lives under `environment.supportPath`. Plain JSON, no database dependency.

```
<supportPath>/
  state.json              # sampler state, tiny, rewritten every tick
  days/
    2026-09-14.json
    2026-09-15.json
```

### `state.json`

```json
{ "v": 1, "lastAt": 1789600920000, "lastKey": "com.google.Chrome", "lastName": "Google Chrome" }
```

### A day file

Per app, per hour. Seconds, not milliseconds, to keep the numbers small.

```json
{
  "v": 1,
  "date": "2026-09-14",
  "apps": {
    "com.google.Chrome": {
      "name": "Google Chrome",
      "hours": [0,0,0,0,0,0,0,0,412,1780,2100,900,0,0,0,0,0,0,0,0,0,0,0,0]
    },
    "com.microsoft.VSCode": {
      "name": "Visual Studio Code",
      "hours": [0,0,0,0,0,0,0,0,0,120,900,2400,0,0,0,0,0,0,0,0,0,0,0,0]
    }
  }
}
```

### Why this shape

- **One file per day** keeps writes small, makes pruning a single `unlink`, and means a
  corrupt file costs one day rather than all history.
- **Hourly buckets** give the timeline view for free without storing raw samples.
- **Aggregating on write** rather than storing raw events is both cheaper and more
  private: there is no event log to leak.
- Keying on `bundleId` with a fallback to `name` keeps entries stable when an app is
  renamed or moved.

### Write safety

Every write is atomic: write to `<file>.tmp`, then `rename`. Raycast auto-terminates
background commands to prevent overlapping runs, but a rename is cheap insurance against
a half-written file after a crash or forced quit.

### Retention

Prune `days/` files older than `retentionDays` (preference, default 90) on each tick.
One `readdir` and a date comparison. Cheap.

---

## 9. Commands

### v1

#### `Collect Usage`

- **Mode:** `no-view`
- **Interval:** `1m`
- **Behaviour:** one tick of [the algorithm](#6-the-sampling-algorithm). Reads the
  frontmost app and idle time, attributes elapsed active time to the previously observed
  app, writes state, prunes old files.
- Must be fast and silent. No toasts, no HUD, no UI. Target well under 100ms per tick.
- Guard with `environment.launchType === LaunchType.Background` so a manual run from the
  root search does not corrupt timing.

This command is the product. Everything else reads what it writes.

#### `Usage Report`

- **Mode:** `view`
- **Behaviour:** aggregate day files across the selected range and render.
- Range dropdown in the search bar: Today, Yesterday, Last 7 days, Last 30 days.

#### `Usage Menu Bar`

- **Mode:** `menu-bar`
- **Interval:** `5m` (a glance does not need minute precision, and a longer interval keeps
  the energy cost near zero)
- **`disabledByDefault`: `true`** — menu bar space is contested and many users resent
  anything that claims it uninvited. Let them opt in.
- **Behaviour:** read-only. Never samples, never writes.
- **Title:** today's total, short, e.g. `4h 12m`.
- **Menu:** top five apps with durations, a separator, then "Open Usage Report".

### Post-v1

- Daily limit alerts
- AI tool for natural-language queries

---

## 10. UI design

### `Usage Report` (`List`)

- `isShowingDetail` enabled
- Search bar dropdown: the range selector
- Sorted by time descending
- Item title: app name
- Item subtitle: a text bar plus share, e.g. `████████░░░░  31%`
- Accessory: formatted duration, e.g. `2h 14m`

A text bar reads better at a glance than a bare percentage and costs nothing.

### Detail panel (markdown)

- Total for the range, prominently
- Daily average across the range
- Hourly timeline for the selected day as a simple text bar chart
- First seen and last seen
- Bundle ID, small, for the curious

### List header

Show tracked coverage honestly, for example:

> Tracked 6h 12m today across 14 apps

Never present the total as "your screen time today" when the sampler may have been off
for part of it. Coverage honesty is the difference between a tool people trust and one
they quietly stop believing, and it is the main thing separating this from a worse
imitation of Screen Time.

### Menu bar

Keep it to a duration. `4h 12m`, nothing more. macOS hides crowded menu bar items, and a
long title is the fastest way to get hidden. The dropdown carries the detail.

### Actions

- Copy report as Markdown
- Export range as CSV
- Exclude this app (writes to preferences, and purges existing rows for that app)
- Open data folder
- Clear all data (with a confirmation alert)

### Empty state

The first-run state is guaranteed, since a fresh install has no data. Make it reassuring
rather than broken:

> **Nothing recorded yet**
> App Usage samples the focused app once a minute while Raycast is running.
> Check back in a few minutes.

---

## 11. Privacy

This section is not boilerplate. It is a product requirement and a review requirement,
and it belongs verbatim in the README.

**Design commitments:**

1. **No network access whatsoever.** The extension makes zero HTTP requests. Nothing is
   uploaded, ever.
2. **Application names only.** Never capture window titles, document names, URLs, or
   clipboard content. Window titles would leak the contents of your work; app names do
   not. This is a deliberate ceiling on what the product will ever know.
3. **Local storage only**, under `environment.supportPath`, in plain readable JSON the
   user can inspect or delete by hand.
4. **Exclusions never hit disk.** An excluded app produces no record at all, not a hidden
   one.
5. **One-action erase.** Clear all data must be reachable in two keystrokes.
6. **Bounded retention** with a user-visible default of 90 days.

State all six in the README and in the store description. An extension that passively
records behaviour has to earn trust before it earns installs.

---

## 12. macOS notes

Target `platforms: ["macOS"]`.

| Concern | Approach |
| --- | --- |
| Frontmost app | `getFrontmostApplication()`, key on `bundleId` |
| Idle time | `ioreg -c IOHIDSystem`, verified 0.03s |
| Menu bar | `MenuBarExtra`, short title only |
| Paths | `path.join` throughout, `environment.supportPath` as the root |
| Shell calls | Only `ioreg`. No AppleScript, no `osascript`, no Automation permission. |

Use `Common` keyboard shortcuts where possible. Custom shortcuts can use the plain macOS
form now that Windows is out of scope:

```ts
{ modifiers: ["cmd", "shift"], key: "e" }
```

**Dropping Windows removes** the platform branching in `core/idle.ts`, the PowerShell
`GetLastInputInfo` cost question, and the constraint that blocked the menu bar command.
It costs the Windows reach advantage: only about 18% of long-tail store extensions support
Windows, so that was a real opening. The trade is deliberate, because the menu bar is what
makes this product ambient rather than something you have to remember to open.

---

## 13. Manifest sketch

```jsonc
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "app-usage",
  "title": "App Usage",
  "description": "See which apps you actually use and for how long. Fully local, no account, no network.",
  "icon": "extension-icon.png",
  "author": "<your-raycast-handle>",
  "categories": ["Productivity", "System"],
  "license": "MIT",
  "platforms": ["macOS"],
  "keywords": [
    "screen time", "usage", "tracking", "productivity", "focus",
    "activity", "digital wellbeing", "statistics", "report"
  ],
  "commands": [
    {
      "name": "collect",
      "title": "Collect Usage",
      "subtitle": "App Usage",
      "description": "Records the focused application once a minute. Runs in the background.",
      "mode": "no-view",
      "interval": "1m"
    },
    {
      "name": "usage-report",
      "title": "Usage Report",
      "subtitle": "App Usage",
      "description": "See which apps you used and for how long.",
      "mode": "view"
    },
    {
      "name": "usage-menu-bar",
      "title": "Usage Menu Bar",
      "subtitle": "App Usage",
      "description": "Show today's total in the menu bar.",
      "mode": "menu-bar",
      "interval": "5m",
      "disabledByDefault": true
    }
  ],
  "preferences": [
    {
      "name": "retentionDays",
      "title": "Keep History For",
      "description": "Days of history to retain before pruning.",
      "type": "textfield",
      "default": "90",
      "required": false
    },
    {
      "name": "excludedApps",
      "title": "Excluded Apps",
      "description": "Comma-separated app names to never record.",
      "type": "textfield",
      "default": "",
      "required": false
    }
  ]
}
```

**No `required: true` preference.** Nothing blocks first run. No API key, no credentials.

---

## 14. Milestones

### M1 — Sampler, storage, idle. No UI.

Build `core/sampler.ts`, `core/idle.ts`, `core/store.ts` and the `collect` command.
Unit-test `tick()` against synthetic sequences: normal ticks, a sleep gap, partial idle,
full idle, an app switch, and a first-ever run with no state.

**Then run it for a full working day and compare the totals against macOS Screen Time.**

**This is the milestone that tells you whether the project works.** If the numbers are not
close to the system's own figures, the product has no reason to exist, because the system's
figures are free and already installed. Do not start the UI until a real day of data looks
right.

### M2 — `Usage Report`

List with range dropdown, detail panel with hourly timeline, honest coverage header,
empty state.

### M3 — Menu bar

`MenuBarExtra` with today's total and the top five apps. Read-only, 5m interval,
disabled by default. Verify it never blocks or slows the sampler.

### M4 — Polish

Exclusions, CSV export, copy as Markdown, retention pruning, clear data with confirmation.

### M5 — Ship prep

README (privacy section verbatim, plus the honest accuracy caveats), screencast,
changelog, icon, `npm run build`, store description.

### Post-merge

1. Daily limit alerts
2. Category grouping
3. Everything in [Deferred](#16-deferred-to-v2)

---

## 15. Store submission checklist

- [x] Searched the store for duplicates (`screen time`, `app usage`: nothing found)
- [x] Searched open PRs in `raycast/extensions` (`screen time`, `app usage`,
      `usage tracker`, `activity tracker`: zero results)
- [ ] `platforms` is `["macOS"]`, correctly capitalized
- [ ] No bundled binaries
- [ ] No Keychain access requested
- [ ] No separate "configure" command
- [ ] `package-lock.json` committed; dependencies installed with **npm**, not yarn/pnpm
- [ ] `npm run build` run locally (does extra type checking beyond `dev`)
- [ ] Extension exercised in Raycast after a distribution build
- [ ] Background command verified to actually fire on schedule after install
- [ ] Menu bar command verified to respect `disabledByDefault`
- [ ] README with the privacy commitments, accuracy caveats, and the honest comparison
      against macOS Screen Time
- [ ] **Screencast** included in the PR
- [ ] `CHANGELOG.md` uses the `{PR_MERGE_DATE}` placeholder, not a hardcoded date
  ```
  ## [Initial Version] - {PR_MERGE_DATE}
  ```
- [ ] Read the Extension Guidelines end to end

**Timeline expectation:** initial review typically takes 10 to 15 business days. PRs go
stale after 14 days of inactivity and close after 21.

---

## 16. Deferred to v2+

| Feature | Notes |
| --- | --- |
| Daily limit alerts | "You've spent 3h in Slack today." Needs a notification path from a background command. |
| Category grouping | Tag apps as Work / Comms / Distraction, report by category. |
| Weekly digest | A Monday summary of the previous week. |
| Focus score | Ratio of deep-work apps to context switches. |
| Switch counting | App switches per hour as a distraction proxy. Cheap to add: the sampler already sees every transition. |
| Import macOS Screen Time history | Backfill from `knowledgeC.db`. **Verified blocked on 14 Sep 2026:** the file exists and is actively written, but `sqlite3` returns `authorization denied` and `ls` returns `Operation not permitted`. Reading it needs Full Disk Access granted to Raycast itself, since extensions inherit Raycast's TCC grants, and the user cannot be prompted for it from code. That plus a private, undocumented schema that Apple reshapes between releases rules it out for a store extension: "no special permissions" is the main advantage over Screen Time, and requiring full disk access to report screen time would trade it away. Revisit only if this stops targeting the store. |
| AI tool | "How long did I spend in Figma this week?" Small addition once the core is stable. |
| Windows support | Reversible later. Would need `GetLastInputInfo` via PowerShell for idle, and the menu bar command would have to become macOS-conditional. |

---

## 17. Open questions

1. **Does background refresh run while the display is asleep?** Affects whether `MAX_GAP`
   ever fires in practice. Empirical question; answer during M1's full-day run.
2. **Attribution when Raycast itself is frontmost.** A user-initiated Raycast launch makes
   Raycast the frontmost app. Background ticks should not observe this, but verify, and
   consider excluding Raycast by default either way.
3. **Interval.** `1m` gives good resolution; `2m` halves the energy cost and barely changes
   daily aggregates. Consider a preference with `1m` default, and measure real battery
   impact before deciding.
4. **Menu bar refresh coupling.** Confirm `MenuBarExtra` at `5m` picks up the sampler's
   writes cleanly, and that a menu bar tick can never delay or overlap a `collect` tick.
5. **Docs conflict on minimum interval** (`10s` on the background refresh page vs `1m` in
   the manifest reference). Not blocking, since `1m` is the plan, but worth confirming.
6. **Does lock time leak through?** `HIDIdleTime` should cover it. If M1's real-day run
   shows otherwise, add the `CGSSessionScreenIsLocked` check from
   [Idle detection](#7-idle-detection).

---

## 18. References

| Resource | URL |
| --- | --- |
| Background refresh | https://developers.raycast.com/information/lifecycle/background-refresh |
| Manifest reference | https://developers.raycast.com/information/manifest |
| Utilities (`getFrontmostApplication`) | https://developers.raycast.com/api-reference/utilities |
| Environment (`supportPath`, `launchType`) | https://developers.raycast.com/api-reference/environment |
| Menu bar commands | https://developers.raycast.com/api-reference/menu-bar-commands |
| Extension guidelines | https://manual.raycast.com/extensions-guidelines |
| Prepare an extension for store | https://developers.raycast.com/basics/prepare-an-extension-for-store |
| Extensions repo | https://github.com/raycast/extensions |
