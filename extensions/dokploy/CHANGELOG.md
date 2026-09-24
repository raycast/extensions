# Dokploy Changelog

## [Fix Services list not refreshing after Create/Delete] - 2026-09-24

- `Create Application`, `Create Database` and `Delete` popped back to Raycast's root (or, for Delete, stopped there without navigating at all) before the refreshed list actually loaded, so the change only showed up after fully restarting Raycast. Fixed so the **Services** list updates immediately.

## [Template Preview] - 2026-09-23

- Add a `Preview` action to `From Template`, showing the domains, environment variables and file mounts a template will create before deploying it.

## [Deploy from Template] - 2026-09-23

- Add a `From Template` action to the `Create` menu on the **Services** screen, browsing Dokploy's public template registry (500+ templates) with search, `Add Bookmark`/`Remove Bookmark`, and a one-action `Deploy` that hands off to Dokploy's own template processing.

## [Runtime Logs: Follow Mode and Compose Support] - 2026-09-23

- `View Logs` now works for Compose stacks: pick a container from its stack to see its logs. Also adds `Start Following`/`Stop Following` to every kind, auto-refreshing the view instead of needing to hit `Refresh` manually.

## [Deploy Service Command] - 2026-09-22

- Add a `Deploy Service` command that searches for a service by name across every configured instance, without opening `Instances` first. Shows each match's environment and current status, and offers the full set of lifecycle actions (Deploy, Redeploy/Rebuild, Start, Stop, Reload) plus `View Logs` - the same actions the Services screen already has, sorted by frecency. Always lists matches and waits for an explicit selection - never acts automatically, even when only one service matches.

## [Schedules] - 2026-09-21

- Add a `View Schedules` action to Applications and Compose stacks, listing scheduled shell commands with `Add Schedule`, `Edit Schedule`, `Run Now`, `View Runs` (with logs) and `Delete Schedule` actions.

## [Compose Backups] - 2026-09-21

- Extend the `View Backups` action to Compose stacks: pick a container and which database engine it runs, alongside the same schedule/destination/retention fields the database version already has.

## [Database Backups] - 2026-09-20

- Add a `View Backups` action to Postgres, MariaDB, MySQL and MongoDB services, listing scheduled S3 backups with `Add Backup`, `Edit Backup`, `Run Backup Now` and `Delete Backup` actions. The backup form can also create a new destination on the spot via `Add Destination`, without leaving to the separate Destinations command.

## [Add Domain Action] - 2026-09-19

- Add an `Add Domain` action to Applications and Compose stacks. Compose stacks get a container picker sourced from the compose file; either kind can auto-fill a generated host via `Generate Domain`, or check its DNS against the target server via `Validate Domain` before saving.

## [View Service Domains] - 2026-09-18

- Add a `View Domains` action to Applications and Compose stacks, listing the domains pointing at the service with `Open Domain`, `Copy URL` and `Delete Domain` actions.

## [Service Environment Variables] - 2026-09-17

- Add a `View Environment` action to the **Services** screen, showing a service's environment variables (masked until revealed), and for Applications its build arguments and build secrets. `Edit Variables` opens a form to change them, and `Copy Environment File` copies the raw `.env` content.

## [Database Connection Actions] - 2026-09-16

- Add `Copy Internal Connection String`, `Copy External Connection String` and `Copy Password` actions to database services (PostgreSQL, MySQL, MariaDB, MongoDB, Redis), matching the URIs Dokploy's own dashboard shows.

## [Deployment History and Rollback] - 2026-09-16

- Add a `View Deployments` action to Applications and Compose stacks, listing past deployments with their status, build logs, and a `Roll Back` action for deployments that produced a rollback point. Running deployments can be cancelled, and history entries deleted.

## [View Service Logs] - 2026-09-14

- Add a `View Logs` action to the **Services** screen, showing the last 200 lines of a service's logs with `Refresh` and `Copy Logs` actions. Not yet available for Compose stacks, which need a container to be picked first.

## [Service Lifecycle Actions] - 2026-09-13

- Add `Deploy`, `Redeploy`/`Rebuild`, `Start`, `Stop` and `Reload` actions to the **Services** screen, so a service can be managed without leaving Raycast.

## [Fix icons not adapting to dark theme] - 2026-09-13

- `folder-input.svg`, `database.svg`, `circuit-board.svg` and `blocks.svg` used a hardcoded stroke color that stayed dark in Raycast's dark theme, making them nearly invisible. Added `@dark` variants so Raycast can pick the right one per theme.

## [Added support for Dokploy v0.25.0] - 2026-01-12

- API data model updated from `Project → Services` to `Project → Environments → Services`.
- Screens/components that previously accepted a `project` now take an `environment` when operating on services.

## [Create & Delete Destinations] - 2025-08-04

- Inner Views now have updated `navigationTitle`s
- Show "name" in **Users**
- `Create` "S3 Destinations"
- `Delete` "S3 Destinations"

## [Initial Version] - 2025-06-13
