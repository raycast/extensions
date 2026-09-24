---
name: posthog-metrics-analysis
description: Use when a user asks a product-metrics question that should be answered from PostHog events, insights, or a verified HogQL query with reproducible evidence.
---

# Metrics analysis

## When to use

Use for product usage, conversion, retention, or trend questions supported by
PostHog data. Keep analysis read-only and state the metric definition explicitly.
Use only this extension's tools named below.

## Workflow

1. Call `whoami` and `list-projects` as needed to resolve the intended project
   and its timezone. Clarify ambiguous projects and retain the returned `projectId`.
   Establish the metric, unit, population, date window, and comparison period.
2. If an existing insight is relevant, call `list-insights` with `projectId`
   and `search`, then `get-insight` with `insightId` and `includeFilters: true`.
   Treat saved filters as evidence of that insight's definition, not a universal metric.
3. Call `get-schema` with `projectId` and relevant `tables` or `search`.
   Inspect available columns before writing SQL. If event or property names are
   unclear, use a bounded `list-events` sample or a small discovery query through
   `query-hogql`. Verify names from returned data rather than guessing.
4. Define the numerator, denominator, identity used for distinct users, exclusions,
   timezone boundaries, and treatment of incomplete periods. Ask when a missing
   definition would materially change the answer; otherwise state the assumption.
5. Call `query-hogql` with `projectId`, a read-only SELECT or WITH query in `query`,
   and a suitable `maxRows`. Bound the query by time and aggregate in SQL.
   Add a SQL LIMIT for exploratory rows; `maxRows` only limits the returned output.
   Avoid fetching personal properties when aggregate counts answer the question.
6. Check query status, columns, returned rows, and `truncated`. Check null values,
   zero denominators, duplicate events, and unexpectedly empty periods.
   If results are truncated, refine the aggregation instead of totaling a partial sample.
   A failed or timed-out query is not a zero result.
7. Explain the result with the exact executed SQL and its scope. Compare like-for-like
   periods and identify alternative explanations for changes. If data is missing,
   describe the gap and the next query needed rather than supplying an invented answer.

## Output

- Direct answer, metric definition, project, date window, and timezone.
- A compact table of results with units, denominators, and comparison values.
- The executed HogQL query and returned insight link when available.
- Assumptions, data gaps, truncation, and limits on the conclusion.

## Do not

- Do not invent event names, schema fields, metric definitions, or query results.
- Do not use a bounded event sample as a population count or ignore truncation.
- Do not claim causation from correlation or expose raw personal data unnecessarily.
