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
| Show Job Performance    | Success rate, run counts, and build-duration chart per job            |
| Show Model Performance  | Slowest models and each model's execution time across runs            |

## Keyboard Shortcuts

Shortcuts follow one scheme across every command, and the same letter means the same thing everywhere.

| Modifier | Does                        | Letters                                                                                                                                       |
| -------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| ⌘⌥       | Go to / view inside Raycast | **P** project · **E** environment · **J** job · **R** runs · **M** models · **S** sources · **L** lineage · **D** details · **G** performance |
| ⌥⇧       | Open the dbt Cloud page     | **P** project · **E** environment · **J** job · **R** run · **L** lineage · **D** docs · **S** settings                                       |
| ⌘⇧       | Copy                        | **C** ID · **.** name · **,** path or URL                                                                                                     |

Other actions: ⌘⇧T trigger a job, ⌘⌥X cancel a run, ⌘D open the lineage diagram, ⌘1–3 change the job performance window.

## ⚙️ Configuration

- dbt Cloud Endpoint - **Settings** > **Account** # **Access URLS**. If your Access URL looks like
  `ab123.us1.dbt.com`, `ab123.eu1.dbt.com`, or `ab123.au1.dbt.com`, pick the matching `[w/ Account Prefix]` option:
  the catalog and lineage commands need your account's own Discovery API host.
- dbt Cloud Account Prefix - **Settings** > **Account** # **Account information** (e.g. `ab123`)
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
