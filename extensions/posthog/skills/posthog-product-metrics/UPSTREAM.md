# Upstream research

Reviewed on September 24, 2026. The best fit is a read-only combination of PostHog's query, product-metric investigation, and metric-definition guidance. The full upstream workflows depend on tools this extension does not expose.

## Public collections

- [PostHog/skills](https://github.com/PostHog/skills/tree/ce816bd3e4b005fbffabc7cd92e1614d95bf96da) is the source used for this adaptation, pinned at `ce816bd3e4b005fbffabc7cd92e1614d95bf96da`. It includes the official platform skills and the omnibus collection. Its [MIT license](https://github.com/PostHog/skills/blob/ce816bd3e4b005fbffabc7cd92e1614d95bf96da/LICENSE) is retained verbatim in [LICENSE](LICENSE).
- [PostHog/context-mill](https://github.com/PostHog/context-mill/tree/dc2898b18fbcfb238f6aa7cbaa3c113f0a273692) assembles and distributes context and skills. The skills repository documents that its official platform skills are generated from this project. It is useful for tracking provenance; it is not a separate runtime dependency.
- [PostHog/ai-plugin](https://github.com/PostHog/ai-plugin/tree/469d1773e9cb55cb2d0cffd0a91e12bbeff8d32e) is the official coding-agent plugin and contains many of the same named skills. It also configures an MCP integration. This adaptation uses the MIT-licensed skills repository, not the plugin's installation or tool setup.
- [PostHog/posthog](https://github.com/PostHog/posthog/tree/f46ccb44ac241653ab5cc0ad83d170f83c5484e0/products) has product-owned skills, including product analytics and data modeling. It helps locate the originating product area. No monorepo files or internal operational skills are bundled here.

## Skills reviewed

All links below are pinned to the reviewed PostHog/skills revision.

| Public skill | Fit for the Raycast extension |
| --- | --- |
| [querying-posthog-data](https://github.com/PostHog/skills/blob/ce816bd3e4b005fbffabc7cd92e1614d95bf96da/skills/omnibus/querying-posthog-data/SKILL.md) | Adapt definition reuse, schema discovery, and choosing a calculation that preserves the requested meaning. Native typed queries, governed-metric catalog tools, and automatic visualizations are unavailable. |
| [investigate-metric](https://github.com/PostHog/skills/blob/ce816bd3e4b005fbffabc7cd92e1614d95bf96da/skills/omnibus/investigate-metric/SKILL.md) | Adapt baseline/current comparisons, seasonality checks, targeted breakdowns, control segments, and evidence versus hypotheses. Exclude scripts, annotations, experiments, replay, and chart creation. |
| [HogQL queries](https://github.com/PostHog/skills/blob/ce816bd3e4b005fbffabc7cd92e1614d95bf96da/skills/posthog/tools-and-features/skills/hogql/SKILL.md) | Adapt scoped SELECTs, property discovery, time filters, and aggregation. Replace dashboard placeholders with explicit predicates; no filter or variable binding is exposed by this tool. |
| [modeling-activation-metrics](https://github.com/PostHog/skills/blob/ce816bd3e4b005fbffabc7cd92e1614d95bf96da/skills/omnibus/modeling-activation-metrics/SKILL.md) | Retain the distinction between a proposed activation event and a validated definition, with explicit unit and early window. Do not build warehouse views or claim an event predicts retention without evidence. |
| [modeling-conversion-metrics](https://github.com/PostHog/skills/blob/ce816bd3e4b005fbffabc7cd92e1614d95bf96da/skills/omnibus/modeling-conversion-metrics/SKILL.md) | Adapt ordered steps, entry cohort, conversion window, unit, and attribution. Exclude durable view/dbt creation and native funnel execution. |
| [modeling-product-usage-metrics](https://github.com/PostHog/skills/blob/ce816bd3e4b005fbffabc7cd92e1614d95bf96da/skills/omnibus/modeling-product-usage-metrics/SKILL.md) | Adapt explicit entry/return events, interval, and person/account unit. This skill does not implement the upstream lifecycle, stickiness, warehouse-view, or dbt workflows. |
| [investigating-metric-anomalies](https://github.com/PostHog/skills/blob/ce816bd3e4b005fbffabc7cd92e1614d95bf96da/skills/omnibus/investigating-metric-anomalies/SKILL.md) | Excluded: this is infrastructure/OTel/Prometheus investigation, requiring metric-characterization, logs, and trace tools. It is distinct from product-metric investigation. |
| [building-a-dashboard](https://github.com/PostHog/skills/blob/ce816bd3e4b005fbffabc7cd92e1614d95bf96da/skills/omnibus/building-a-dashboard/SKILL.md) | Excluded: requires dashboard/template readers and dashboard/insight mutation tools. The interactive Dashboards command is not an AI tool. |
| [configuring-experiment-analytics](https://github.com/PostHog/skills/blob/ce816bd3e4b005fbffabc7cd92e1614d95bf96da/skills/omnibus/configuring-experiment-analytics/SKILL.md) | Excluded: requires experiment definitions, exposure rules, shared metrics, and experiment updates. Current feature-flag settings cannot establish experiment exposure or results. |

## Changes for Raycast

The compact skill replaces upstream MCP names with this extension's nine registered tools. It uses existing insight definitions when available and explicit custom HogQL calculations when they satisfy the user's request. It does not install a CLI, MCP server, plugin, scripts, or additional dependencies. [TOOLS.md](TOOLS.md) records every tool and all 36 top-level inputs after reviewing the manifest, all nine files in `src/tools/`, and `src/posthog-client.ts`.

The adaptation adds concrete handling for the extension's result shapes:

- `get-insight` returns legacy `filters` and optional stored `result`, but omits the modern `query` body. Results are not forcibly refreshed; filters and results can be truncated. Exact reproduction stops when the definition cannot be recovered. Saved insights do not prove governed-metric approval.
- `get-schema.search` matches table names only, not event names or dynamic property names. Event discovery uses a bounded aggregate query; raw event/person readers supply small examples only.
- `maxRows` limits local query output, not server work. `rowCount` is the server response's row-array length. Neither it nor `truncated: false` establishes a full event population. Nested values are shortened separately, and duplicate column names overwrite values in the output object.
- List readers expose `next` but no cursor input. Narrowing a search may locate a specific record; it does not prove an exhaustive inventory. Schema filtering itself can set `truncated`, so it is not a reliable missing-column indicator.
- Current flag metadata has no update timestamp, exposure history, or experiment result. The skill uses it only to form hypotheses and separates correlation from causation.
- Native funnel/retention queries, metric-catalog reads/runs, full insight-query reads/refreshes, and dashboard/insight/flag/experiment writes have no registered tools. Requests depending on those capabilities stop with the gap reported; the skill never substitutes an undisclosed approximation.

The initial preparation added skill registration, documentation, the license, and the changelog. Tool source and AI instructions/evals remain unchanged. The API dependency and lockfile now target the exact public version `2.5.0`, preserving this extension’s pinned-version policy.

## Validation

The public API dependency and lockfile now target 2.5.0. See [validation results](VALIDATION.md) for checks completed after release. These prompts are a future manual test plan, not executed transcripts:

1. "In our Production project, how many people performed our core activity each day for the last seven complete days? Use the existing active-user definition if you can read it, compare the previous week, and show the HogQL and timezone."
2. "Signup-to-paid conversion dropped last week. Check our saved conversion insight, compare complete cohorts using its conversion window, and investigate the biggest segment changes. If you cannot read its full definition or reproduce it exactly, tell me what is missing."
3. "Investigate whether the new-onboarding flag explains our activation drop, then save your findings to a dashboard." Expected: distinguish current flag configuration from historical exposure, separate hypotheses from observations, and report that dashboard creation is unsupported without attempting a write.
