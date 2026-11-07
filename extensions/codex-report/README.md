# Codex Report

Usage history, an activity heatmap, and estimated API costs from your local
Codex and Claude Code sessions.

The extension reads the session logs that Codex (`~/.codex`) and Claude Code
(`~/.claude`) already write on your Mac. It needs no account or API key and
sends nothing over the network. Git groups sessions by repository in
**Show Projects**.

Raycast does not load your shell profile, so `CODEX_HOME` or
`CLAUDE_CONFIG_DIR` set there are not applied; the extension reads the
default `~/.codex` and `~/.claude` folders.

Search Raycast for **Show Codex Report** or **Show Activity Heatmap**.

## Dashboard

- ⌘1: Today
- ⌘2: This Week, starting on Monday
- ⌘3: This Month
- ⌘← / ⌘→: Previous / next day, week, or month; next stops at the current period
- Click the Agents tags: All Agents, Codex (blue), or Claude (orange)
- ⌘4: All Agents · ⌘5: Codex · ⌘6: Claude
- ⌘R: Refresh
- ⌘K: Open Actions, including switching between messages, tokens, and estimated costs or copying JSON
- ⌘⇧C: Copy a readable summary

⌘1/2/3 return to the current period. Past weeks and months include the full
period; the current period ends today.

All periods use the local time zone. The default is the current week. Activity
charts show aligned weekday and date columns, with weekly groups in the monthly
view. The default is All Agents; the CLI still defaults to Codex. In All Agents, each activity bar is stacked
with Codex in blue and Claude in orange; the legend also labels the colors.
The selected agent filters the totals, detail lists, copied summary/JSON and PNG
export. Switching back to a loaded agent/period reuses its report in memory;
Refresh invalidates all loaded views. Bars share one scale across the selected period. Charts are SVG images
without hover interaction.

## Explore

The dashboard is the entry point. Native searchable lists show details without
re-reading session logs:

- ⌘M: Models, with estimated costs and sorting by tokens, recorded turns, or cost
- ⌘E: Estimated API Costs, including explicitly unpriced models
- ⌘I: Reasoning Efforts and Fast Mode share of known service tiers
- Actions → Show Projects: session counts grouped by repository, including worktrees,
  using the same grouping as the CLI; details show the repository or directory and
  estimated costs, with sorting by sessions or cost
- Escape: Return to the dashboard

Each detail list offers Copy Summary, Copy Name, and Copy Value. Projects are
sorted by session count. Reasoning effort counts exclude turns without recorded
settings. Costs use the existing CLI API-equivalent estimates, including its
Reserve alias; they do not represent subscription fees. The cached-input share
is calculated relative to input tokens. The costs dashboard and cost details
show the CLI's reported pricing assumptions, including unknown cache duration.

## Activity heatmap

Open **Show Activity Heatmap** directly or use the dashboard's Actions menu.
It defaults to tokens, both agents, and six calendar months ending today.
- ⌘1: Six months ending today
- ⌘2: Current calendar year, January through December
- ⌘3: Switch Daily / Weekly
- ⌘← / ⌘→: Previous / next six-month window or calendar year

Every year includes January through December, with empty cells for dates without usage. ⌘1 and ⌘2 return to the current
period. Actions also switch between tokens, messages, and estimated API costs.

Columns are weeks, Monday through Sunday. Month and weekday labels identify
both axes. Grey means zero usage for the selected metric; dates outside the
window are omitted. Four intensity levels use the combined daily peak divided
by 64, 16, and 4, then the peak itself. These thresholds stay fixed when switching
agents (⌘4 / ⌘5 / ⌘6), so their usage remains comparable.

Weekly stacks up to seven blocks per column using the selected metric’s weekly
sum. The strongest combined week fills seven blocks; other nonzero weeks round
up on a square-root scale, making smaller weeks easier to distinguish. This peak stays fixed across agent filters. Boundary weeks
include only dates in the selected window, and empty future weeks stay visible.
Whole blocks approximate each agent’s share of the selected metric, with Codex
below and Claude above. Shares round to the nearest block, so small shares can
disappear and exact ties allocate the extra block to Codex. Axis labels show
usage thresholds rather than percentages. **Show Weekly Activity**
opens exact weekly totals and per-agent contributions.

Each day uses the color of the agent with the largest value for the selected
metric. Exact ties use purple, labeled **Equal share** in the legend when present.
Intensity shows the combined daily total, so the color indicates the winner
rather than its share; both contributions remain available in the details. **Show Daily Activity** opens a searchable native list
with exact totals and each agent's recorded usage. Cost views flag partial
estimates and exclude unpriced usage. Export as PNG includes the selected view
and its legend.

## Data and caching

The extension bundles the [codex-report](https://github.com/flkrnr/codex-report)
CLI and runs it with Raycast's Node runtime; it does not run a separate server.
Parsed sessions are cached in `~/.codex/cache` and `~/.claude/cache` and shared
with the CLI (`npx codex-report`), so whichever runs first fills the cache for both.
Reports only read transcripts that can cover the selected period: without a cache,
the current week loads in about two seconds, while the full history behind the
heatmap takes about 50 seconds once for 5,000 session files. Later reports load in
under a second. Reports run one at a time, so switching periods or agents during a
scan never discards it. Cache files are versioned; after an update that changes the
format, the cache is rebuilt once.
A bounded Raycast cache keeps successful reports across command openings.
Previously loaded periods display immediately while a fresh report loads in the
background; the heatmap marks this state. A new period still needs an initial
scan. Refresh clears saved reports for every window and agent.
During refresh, the previous report stays visible. If refresh fails, that report
is explicitly marked as the last successful result.

Category costs reuse cached model-token totals without changing the cache format.
Unknown prices are shown as **Unpriced**; mixed priced/unpriced usage is marked
**partial**. Cost sorting places entirely unpriced entries last. Activity cost bars
and PNG exports use the same estimates.

## Development

The bundled CLI in `assets` is a copy of the published
[`codex-report`](https://www.npmjs.com/package/codex-report) npm package, pinned
as a devDependency. To ship a new CLI release, install it with
`npm install --save-dev --save-exact codex-report@<version>` and run
`npm run sync-cli`. `npm run sync-cli-dev` copies unreleased changes from the
surrounding repository for local testing; `npm test` fails until the assets
match the pinned release again.

```sh
npm install
npm run dev
```

Validate the extension with:

```sh
npm run build
npm run lint
npm run typecheck
npm test
```
