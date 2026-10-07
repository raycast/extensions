# Railway Changelog

## [Services, Usage & Menu Bar] - {PR_MERGE_DATE}

- Press Enter on a project to see its services with deployments, logs, variables, domains, and metrics
- Redeploy, restart, or remove deployments without leaving Raycast
- Star projects (⌘ + .) to pin them to the top, and filter projects and templates by workspace
- Copy ready-to-run Railway CLI commands for services and deployments
- New `Show Usage` command and `Last Deploy` menu bar command
- Support workspace and project tokens with the new `Token Type` preference
- The API token moved to the extension preferences, so you may need to enter it again
- Fixed Search Templates crashing on results without a creator

## [Add Template Search] - 2026-05-17

- Added a new `Search Templates` command to browse and search Railway templates
- List shows template name, creator, image, deployment count, health score, and verified badge
- Actions: deploy on Railway, view template page, copy URLs

## [Fix Action Links] - 2024-11-12

- Fixed broken links in the actions, new actions are:
  - Project Architecture (default action)
  - Project Settings (CMD + s)
  - Project Observability (CMD + o)
  - Project Logs (CMD + l)

## [Enable Team Projects] - 2024-08-26

- Added support for Team Projects, depending on the API Token you will see the team projects or your personal projects

## [Show Error Toasts + Cache Projects] - 2024-08-14

- A `Failure` toast is shown if something goes wrong
- The API Token is now `required`
- Rename icon so it shows up properly in Raycast Store

## [Fix] - 2023-09-24

- Fixed an error in `Search Project` that caused the extension to crash
