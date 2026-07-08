# MikroTik MCP — Raycast Extension

Operate your MikroTik fleet from Raycast. This extension is a **client of the
[MikroTik MCP](https://github.com/mikrotik-mcp/mikrotik-mcp) observability dashboard** — it
mirrors every dashboard view using the native Raycast UI kit. It never talks to RouterOS
directly; it reads and acts through the dashboard's `/api/*` HTTP endpoints (the MCP server
does the SSH/RouterOS work).

## Prerequisites

Run the MCP server with the dashboard enabled:

```bash
mikrotik-mcp serve --dashboard          # binds 0.0.0.0:9090 by default
```

Set a token if you want the dashboard gated (recommended if it's reachable on your LAN).

## Setup

Open any command's preferences (⌘,) and set:

- **Dashboard URL** — e.g. `http://127.0.0.1:9090`
- **Access Token** — the dashboard bearer token (leave empty if unset)

## Commands

| Command            | What it does                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| **Overview**       | Tool-call volume, latency, error rate and per-risk / per-tool breakdowns                                 |
| **Devices**        | Router connectivity, CPU/MEM/DISK gauges, health sparklines, SSH pool, enable/disable                    |
| **Clients**        | LAN devices on a router — live traffic, block/allow, pin IP, set IP, label, rate limits, usage           |
| **RADIUS & UM**    | RADIUS client + User Manager — users, profiles, limitations, NAS, assignments, sessions, settings, usage |
| **Topology**       | Configured devices and discovered Layer-2 neighbours (MNDP/CDP/LLDP), onboard stubs                      |
| **Packet Capture** | Live decoded TZSP capture — protocols, top talkers, start/stop, pcap export                              |
| **Snapshots**      | Browse stored config snapshots and time-travel diff any two                                              |
| **Drift Guard**    | Golden-config baselines and live drift detection with attribution                                        |
| **Change Plan**    | Dry-run intended RouterOS commands — risk-scored and safely ordered                                      |
| **S3 Backups**     | List, download (presigned) and delete S3 backup objects                                                  |
| **Backups**        | Local config vault — create, upload, rename, download, restore, delete                                   |
| **Modules**        | Enable/disable tool modules — curate the exposed MCP surface                                             |
| **Config**         | Effective config editor (validate / preview / safe-apply), version history, field guide                  |
| **Memory**         | Knowledge graph — entities, relations, observations, activity                                            |
| **Live Feed**      | Every MCP tool call in real time (WebSocket, SSE fallback)                                               |

## Notes

- **Real-time** views (Live Feed, client traffic, packet capture) stream over the dashboard's
  WebSocket (`/api/stream`) with an SSE fallback, using the Node runtime's global `WebSocket`.
- **Destructive** actions (client block, config apply/restore, backup restore/delete, drift
  baseline removal, entity/event deletion, counter reset) always ask for confirmation.
- Charts are rendered with native substitutes (progress-icon gauges, unicode sparklines,
  colored tags) since Raycast has no chart kit.

## Development

This extension is a Bun-workspace member of the mikrotik-mcp repo. Its TypeScript and Prettier
come from the repo root; ESLint stays local (Raycast's config). From `raycast/`:

```bash
npm run dev      # ray develop (hot reload)
npm run build    # ray build
npm run lint     # ray lint
```
