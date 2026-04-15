# Local Services

Discover and manage all localhost services running on your machine — Node servers, Python apps, Docker containers, and more.

## What it shows

- **Running processes** — any service detected by `lsof` listening on a TCP port (Node, Python, Ruby, Go, Java, PHP, Rust, etc.)
- **Docker containers** — running containers with their port mappings
- **Compose services** — stopped services declared in `docker-compose.yml` files found under your home directory
- **Custom domains** — entries from `/etc/hosts` pointing to `127.0.0.1` or `::1`

## Actions

| Action | Shortcut |
|---|---|
| Open in browser | Enter |
| Copy URL | Cmd+C |
| Copy port | Cmd+Shift+C |
| Kill process / Stop container | Cmd+Shift+Backspace |
| Start stopped Compose service | Cmd+Enter |
| Refresh | Cmd+R |

## Preferences

| Preference | Default | Description |
|---|---|---|
| Ignored Ports | — | Comma-separated list of ports to hide (e.g. `631,5000`) |
| Enable Docker Detection | On | Scan running Docker containers for port mappings |
| Scan /etc/hosts | On | Show custom local domains from `/etc/hosts` |
| Scan Docker Compose Files | On | Detect stopped services from `docker-compose.yml` files |
