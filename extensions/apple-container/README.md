# Apple Container

Manage Linux containers on macOS using Apple's native container runtime — no Docker Desktop required.

## Prerequisites

This extension requires **Apple Container** (`container` CLI), available on macOS 26 (Tahoe) and later.

Install via Xcode or download the CLI tools from [developer.apple.com](https://developer.apple.com).

Verify it's installed:

```bash
/usr/local/bin/container --version
```

## Commands

### Containers

Browse all running and stopped containers grouped by network as stacks (like Docker Compose). Each container shows a rich detail panel with status, image, uptime, resource limits, ports, network info, mounts, environment variables, and flags.

**Actions:**

- **View Logs** — static or streaming (follow mode)
- **Open Shell** — opens Terminal.app or iTerm2 with an interactive shell
- **Run Command** — execute a command inside a running container
- **Start / Stop / Restart** — individual or entire stack
- **Delete** — individual container or full stack (containers + network)
- **Prune** — remove stopped containers, unused images, or unused volumes

### Images

Browse local container images with digest, size, and creation date.

**Actions:**

- **Pull New Image** — pull any image by reference
- **Pull Latest** — re-pull the current tag
- **Inspect** — view full image metadata
- **Delete** — remove an image

### Run Container

Form-based container creation with support for:

- Image reference, container name, command override
- Network selection (auto-populated from existing networks)
- Port mappings, environment variables, volume mounts
- Resource limits (CPU, memory)
- Flags: detach, auto-remove, Rosetta, read-only, init, SSH forwarding

### Container Status (Menu Bar)

Persistent menu bar icon showing the number of running containers. Click to see stacks grouped by network — click any container to toggle start/stop. Quick links to open the full extension or run a new container.
