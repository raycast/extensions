# dbt Catalog

Browse your dbt Cloud catalog from Raycast — models, sources, lineage, jobs, runs, and environments.

## Commands

| Command                 | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| Quick Search            | Search across projects, jobs, environments, and runs                  |
| Browse Models (Catalog) | Browse models with columns, tests, lineage, and metadata              |
| Browse Sources          | Browse data sources with freshness status and downstream dependencies |
| Explore Lineage         | Explore upstream and downstream lineage for models and sources        |
| Trigger Job             | Trigger a dbt Cloud job run                                           |
| Show Job Runs           | View recent job runs with status filtering                            |
| Show Projects           | Browse projects with repository and connection details                |
| Show Jobs               | Browse, view, and trigger jobs                                        |
| Show Environments       | Browse environments and their configurations                          |
| Show Job Performance    | View per-job execution metrics and performance trends                 |

## Setup

1. In dbt Cloud, go to **Account Settings → API Access** and create a Personal Access Token.
2. Note your **Account ID** — it appears in the account settings URL.
3. Open the extension preferences in Raycast and fill in:

| Preference               | Required | Notes                                                            |
| ------------------------ | -------- | ---------------------------------------------------------------- |
| dbt Cloud API Token      | Yes      | Personal Access Token (stored securely by Raycast)               |
| dbt Cloud Account ID     | Yes      | Numeric account identifier                                       |
| dbt Cloud Region         | Yes      | US, EMEA, Australia, or Custom Instance                          |
| Custom dbt Cloud URL     | No       | Only when Region is `Custom Instance`, e.g. `abc123.us1.dbt.com` |
| Custom Discovery API URL | No       | Override the metadata GraphQL endpoint if auto-detection fails   |

## AI Tools

The extension exposes tools to Raycast AI, so you can ask things like:

- `@dbtcatalog find models related to orders`
- `@dbtcatalog what are the upstream dependencies of fact_revenue?`
- `@dbtcatalog trigger the nightly job`

Catalog, source, and lineage data comes from the dbt Cloud Discovery API; jobs, runs, and
environments come from the Administrative API.
