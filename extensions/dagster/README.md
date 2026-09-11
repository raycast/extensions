# Dagster for Raycast

Browse and interact with your [Dagster](https://dagster.io) instance from Raycast.

## Commands

### Assets

Browse all assets, view materialization history and metadata charts, and trigger materializations.

**Materialization actions:**

- **Materialize** — materialize the selected asset
- **Materialize + Downstream** — materialize the asset and all its downstream dependants
- **Materialize + Upstream** — materialize the asset and all its upstream dependencies
- **Materialize + Upstream + Downstream** — materialize the full lineage in both directions

Assets are grouped by job automatically. If the selected assets span multiple jobs, one run is launched per job.

### Recent Runs

View recent pipeline runs with status, duration, and drill-down to see errors and which assets were materialized in each run.

### Jobs

Browse jobs grouped by code location. Launch new runs, retry from failure, and manage schedules (start/stop).

### Run Status

Background command that shows the status of the last 10 runs as emoji icons directly in Raycast search. Refreshes every 10 minutes.

- 🌿 Success
- 🔥 Failure
- 🌻 Running / Queued
- 🍂 Canceled

## AI Tools

This extension provides AI tools that let you query Dagster from Raycast AI Chat. Type `@dagster` in AI Chat followed by a question.

| Tool | Description |
|---|---|
| Get Assets | List assets filtered by name or group |
| Get Runs | Fetch recent runs filtered by status or job name |
| Get Run Errors | Fetch step failures and stack traces for a run |
| Get Asset Materializations | Fetch materialization history with metadata |
| Get Jobs | Fetch jobs with schedules and last run status |
| Materialize Asset | Trigger materialization with scope selection (requires confirmation) |
| Launch Job | Launch a job run (requires confirmation) |

**Example prompts:**

- "What are my recent failed runs?"
- "Why did the last run fail?"
- "When was fct_listings last materialized?"
- "Materialize fct_listings and downstream"

## Configuration

| Preference | Required | Description |
|---|---|---|
| Dagster URL | Yes | Base URL of your Dagster instance |
| Extra Headers | No | JSON object of extra HTTP headers (e.g. Cloudflare Access) |
| Username | No | Basic auth username |
| Password | No | Basic auth password |

## Limitations

- **No partition support** — partitioned assets are excluded from materialization actions. Dagster uses a separate backfill API for partitioned assets which is not yet implemented.
- **No "materialize unsynced"** — there is no action to materialize only stale/missing assets. In the context of acting on a single asset at a time, this adds little value over simply materializing it.
