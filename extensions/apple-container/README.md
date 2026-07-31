# Apple Container

Manage Linux containers, images, and volumes created by Apple's open-source [`container`](https://github.com/apple/container) CLI — straight from Raycast.

> This is an unofficial, community-built extension. It is not affiliated with, endorsed by, or sponsored by Apple Inc. "Apple" and "Apple silicon" are trademarks of Apple Inc.

## Requirements

- **macOS 26** or later on a Mac with **Apple silicon**. The `container` tool relies on virtualization and networking features that are only available on macOS 26.
- The **`container` CLI** installed. Download the signed installer from the [GitHub releases page](https://github.com/apple/container/releases), then start the service once with:

  ```bash
  container system start
  ```

By default the extension calls the binary at `/usr/local/bin/container`. If yours lives elsewhere, set the path under **Container CLI Path** in the extension preferences.

## Commands

- **Manage Containers** — list running and stopped containers, start/stop/restart/kill/delete them, open a shell in Terminal, view logs, and inspect details.
- **Manage Images** — list images, pull from a registry, run a container, tag, inspect, delete, and prune.
- **Manage Volumes** — list, create, inspect, and delete volumes.
- **Container System** — view the daemon status and disk usage, and start/stop/restart the service.
- **Running Containers** — a menu bar item showing how many containers are running, with quick stop actions.

## Preferences

- **Container CLI Path** — absolute path to the `container` binary (default `/usr/local/bin/container`).
- **Auto Refresh** — periodically refresh lists while a command is open (off by default to save CPU; lists also refresh after every action and via `⌘R`).

## Notes

- Interactive shells and live log following open in Terminal.app, since Raycast cannot host an interactive terminal session.
- If the system service isn't running, the extension shows a recovery screen with a one-click **Start Container Service** action.
