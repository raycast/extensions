# Docker Changelog

## [Docker Context Support] - 2026-09-22

- Use the endpoint of the current Docker CLI context (`docker context use`) when no socket path is configured, so alternative runtimes such as Colima, OrbStack, Rancher Desktop, Podman and Lima work out of the box like they do with the `docker` CLI. TLS certificates and `SkipTLSVerify` stored with the context are applied for remote `tcp://` endpoints.
- Honor the `DOCKER_HOST`, `DOCKER_CERT_PATH` and `DOCKER_TLS_VERIFY` environment variables when set.
- Accept `unix://`, `npipe://`, `tcp://`, `http://` and `https://` prefixed values in the "Socket path" preference.

## [Security Maintenance] - 2026-05-21

- Updated the extension to address security advisories.

## [Windows Support] - 2025-10-30

- Added Windows support for the Docker extension
- Updated keyboard shortcuts to be platform-specific (Cmd on macOS, Ctrl on Windows)
- Platform-specific default socket paths (macOS: `/var/run/docker.sock`, Windows: `//./pipe/docker_engine`)
- Updated dependencies to latest Raycast API version

## [Feature] - 2025-09-08

- Show loading toasts while container actions are running.

## [Improvement] - 2025-06-15

- Group containers by state in the container list view

## [Feature] - 2025-06-10

- Added action to Stop and Remove Container if it is running.

## [Improvement] - 2025-03-12

- Show project icon in green if all containers are running.

## [Feature] - 2025-02-04

- Added ability to search containers by their image-name or id.

## [Standard Shortcuts] - 2025-01-25

- Standardized the removal shortcut with other extensions
- Updated the dependencies and fixed security issues

## [Feature] - 2023-12-15

- Added support for http, https, and tcp sockets

## [Fix] - 2023-12-19

- Fixes errors on image detail view

## [Feature] - 2023-05-12

- Added ability to create container from image

## [Added screenshots] - 2022-12-22

## [Fix] - 2022-08-25

- Fixed issue where default empty setting caused docker client to connect to incorrect address

## [Improcement] - 2022-08-24

- Added option to configure the Docker socket path

## [Improvement] - 2022-06-09

- Added ability to Copy Container ID
- Added container details metadata

## [Fix] - 2022-05-16

Fixes Manage Images command

## [Maintenance] - 2021-11-08

- Updates triggered from one screen will reflected on another, for example starting container from container detail view will update container list view and project list, respectively
- Updates triggered outside of Raycast extension are reflected
- Updated icons for containers, images and compose projects
- Fixes render bugs in Image detail view
- Improve error messages for commands triggered from ActionPanel

## [Initial release] - 2021-10-02
