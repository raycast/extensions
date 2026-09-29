# Dokploy Changelog

## [Container Files and Docker Events] - {PR_MERGE_DATE}

- Add `Browse Files` to running containers in the Docker list: a read-only view of the container's folders and text files (the first 512 KB of a large file), with `Copy Path` and `Copy Content`.
- Add `Docker Events`: container, image, volume and network events on the server from the last 5 minutes up to 24 hours, newest first, with each event's details one shortcut away.
- Both need Dokploy v0.30.0 or later.

## [Container Actions] - 2026-09-29

- Add `Restart`, `Start`, `Stop`, `Kill` and `Remove Container` to the Docker containers list. Only the actions that fit the container's current state are shown. `Stop`, `Kill` and `Remove` ask for confirmation first, and for an application's Swarm-managed container the confirmation explains that Swarm will start a replacement. Everything except `Restart` needs Dokploy v0.29.0 or later.
- Add `Refresh` to the Docker containers list.

## [Stop Builds and Cancel Queued Deployments] - 2026-09-29

- Add `Stop Running Builds` and `Cancel Queued Deployments` to a service's deployment history, each with a confirmation. Stopping builds affects every build on that service's server, and the confirmation says so.
- Fix `Cancel` showing on running Application and Compose deployments, where it always failed with "Deployment is not running". Dokploy can only cancel schedule runs that way, so it now only shows when it can work.

## [Enable or Disable a Domain] - 2026-09-28

- Add `Enable Domain` / `Disable Domain` to a service's domains (Dokploy v0.30.0+). Disabling asks for confirmation first. On a Compose stack, the change applies on the next redeploy.

## [Faster Deployments Feed] - 2026-09-28

- `Deployments` now loads each instance with a single request on Dokploy v0.29.0+, instead of one request per service. Services that have never been deployed are no longer listed. Older instances keep working the previous way.

## [libSQL Services] - 2026-09-28

- Show libSQL databases (Dokploy v0.29.0+) in `Services`, `Deploy Service`, and the AI tools, with Deploy, Rebuild, Start, Stop, Reload, `View Logs`, `View Environment`, and `Delete`. They were previously left out entirely.

## [Fix Database Names in Deploy Service, Deployments, and AI Tools] - 2026-09-27

- Fix databases showing up by their id, with no status, in `Deploy Service`, `Deployments`, and the AI tools on recent Dokploy versions, which stopped including database names and statuses in the project list these read from. The AI tools can find a database by name again.

## [Fix Destination Connection Test and MongoDB Delete] - 2026-09-27

- Fix `Add Destination`'s connection test, which always reported "Connection Failed" because it called a misspelled route. A failed test now also shows Dokploy's reason.
- Fix deleting a MongoDB service, which sent the request to the wrong route and never deleted it.

## [AI Tools: Deploy and Control Services] - 2026-09-27

- Add 2 AI tools that change a service, each asking you to confirm first: Deploy Service (rebuild an application or Compose stack from its latest source, or restart a database with its data kept) and Control Service (start, stop, or reload).
- AI tools can now narrow a service lookup by environment, so a service with the same name in e.g. `production` and `staging` can be told apart.

## [AI Tools] - 2026-09-27

- Add 7 read-only AI tools: List Instances, List Projects, List Services, Get Service, Get Service Logs, List Deployments, and Get Deployment Logs. Search across every configured instance by name, project, or kind.

## [Docker Cleanup] - 2026-09-26

- Add a `Docker Cleanup` action to the `Docker` command: shows disk usage per category (containers, images, volumes, build cache) and lets you clean stopped containers, unused images, unused volumes, the build cache, or run a full prune, each behind a confirmation dialog. Requires an org-admin API key.

## [Menu Bar Server Health] - 2026-09-26

- Add a `Server Health` menu bar command showing disk/memory/container status for every configured instance, without opening Raycast's main window. The icon tints red when any instance's disk usage crosses a configurable threshold.

## [Deployments Feed Command] - 2026-09-25

- Add a `Deployments` command showing the most recent deployment for every Application and Compose stack across every configured instance, sorted by recency. Opens straight into the full deployment history (rollback, cancel, delete) for whichever one you pick.

## [Sort Projects, Services, and Docker by Frecency] - 2026-09-25

- **Projects**, **Services**, and **Docker** now sort by how often you actually open each one, not raw API order - matching how **Deploy Service** already sorts. Scoped per instance, so frequently-used items in one account never affect another's ranking.

## [Switch Instances Without Leaving the Screen] - 2026-09-25

- Add an instance switcher to **Projects**, **Docker**, **S3 Destinations**, and **Users** - pick a different configured instance right from where you are, no need to go back to **Instances** first.
- The **Instances** screen now shows a checkmark on whichever instance is currently active. Switching only happens when you actually choose to open a screen for a specific instance - arrowing past its row in the list no longer does it silently.

## [Edit and Delete Instances] - 2026-09-24

- Add `Edit Instance` and `Delete Instance` actions to the **Instances** screen. Editing re-verifies the API key the same way adding one does; deleting only removes the instance from Raycast and doesn't revoke the key or change anything on the Dokploy server.
- Editing or deleting the currently active instance keeps the extension's cached connection in sync automatically.
- Fix **Services** failing to load for any project managed with Dokploy's environments feature - entering it from **Projects** or **Environments** errored instead of showing the service list.

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
