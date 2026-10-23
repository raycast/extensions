# dbtCloud Changelog

## [Catalog, Lineage, and AI Tools] - {PR_MERGE_DATE}

- Add commands to browse models, sources, and lineage via the dbt Cloud Discovery API
- Add commands to browse projects, jobs, and environments, trigger jobs, and view job performance
- Add status filtering and run details to Show Job Runs
- Add AI tools for searching models and sources, reading lineage, and managing jobs
- Add optional Custom Discovery API URL preference
- Add Europe and AU account-prefix endpoints for cell-based accounts
- AI tools search the production environment of every project when no environment is given
- Show Job Performance lists every active job by project and environment, with success rate, run counts, and a build-duration chart over 7, 14, or 30 days
- Add Show Model Performance: slowest models per environment, with each model's execution time and status across its recent runs
- Every view has a Go To section that moves up and down the dbt hierarchy (project, environment, job, run, model, source): for example from a job to its runs and performance or up to its environment and project, and from a model to its last run, last job, lineage, and performance. The dbt Cloud page for each is still available under Open in dbt Cloud

## [Modernize + Specify Endpoint] - 2026-06-30

- Add `README.md`

## [Initial Version] - 2022-03-26
