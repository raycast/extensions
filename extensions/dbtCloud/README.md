<p align="center">
    <img src="./assets/icon_64p.png" />
</p>

# dbt Cloud

Browse your [dbt Cloud](https://www.getdbt.com/) account from Raycast: models, sources, lineage, jobs, runs, projects, and environments.

## Commands

| Command                 | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| Show Job Runs           | View recent job runs with status filtering                            |
| Quick Search            | Search across projects, jobs, environments, and runs                  |
| Browse Models (Catalog) | Browse models with columns, tests, lineage, and metadata              |
| Browse Sources          | Browse data sources with freshness status and downstream dependencies |
| Explore Lineage         | Explore upstream and downstream lineage for models and sources        |
| Trigger Job             | Trigger a dbt Cloud job run                                           |
| Show Projects           | Browse projects with repository and connection details                |
| Show Jobs               | Browse, view, and trigger jobs                                        |
| Show Environments       | Browse environments and their configurations                          |
| Show Job Performance    | View per-job execution metrics and performance trends                 |

## ⚙️ Configuration

- dbt Cloud Endpoint - **Settings** > **Account** # **Access URLS**
- dbt Cloud Account Prefix - **Settings** > **Account** # **Account information**
- dbt Cloud API Token - **Settings** > **API tokens** > **Personal tokens**
- dbt Cloud Account ID - **Settings** > **Account** # **Account information**
- Custom Discovery API URL (optional) - only needed if the catalog and lineage commands cannot reach the Discovery API URL derived from your endpoint

## AI Tools

The extension exposes tools to Raycast AI, so you can ask things like:

- `@dbtcloud find models related to orders`
- `@dbtcloud what are the upstream dependencies of fact_revenue?`
- `@dbtcloud trigger the nightly job`

Triggering a job always asks for confirmation first.

Catalog, source, and lineage data comes from the dbt Cloud Discovery API; jobs, runs, and environments come from the
Administrative API.
