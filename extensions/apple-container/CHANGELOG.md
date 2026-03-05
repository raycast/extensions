# Apple Container Changelog

## [v0.1.0] - {PR_MERGE_DATE}

Initial release.

### Commands

- **Containers** — List and manage containers grouped by network as stacks (compose-like). Rich detail panel with status, image, uptime, resources, ports, mounts, environment, and flags.
- **Images** — Browse, pull, inspect, and delete container images.
- **Run Container** — Form-based container creation with network, ports, env, volumes, resource limits, and flags.

### Features

- Network-based stack grouping with stack-level actions (stop, start, restart, delete stack)
- Streaming log follow mode with live output
- Open interactive shell in Terminal.app or iTerm2
- Run non-interactive commands inside containers
- System container separation (buildkit, etc.)
- Prune actions for containers, images, and volumes
