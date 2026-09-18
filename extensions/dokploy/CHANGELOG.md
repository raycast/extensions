# Dokploy Changelog

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
