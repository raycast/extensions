# MikroTik MCP Changelog

## [Initial Version] - {PR_MERGE_DATE}

First release — a full-featured Raycast companion for the MikroTik MCP observability
dashboard, bringing the entire dashboard surface to the Raycast launcher across 17
commands.

### Commands

- **Fleet Menu Bar** — live cockpit in the macOS menu bar: fleet health, tool-call
  activity and alerts at a glance, refreshed on an interval.
- **Overview** — tool-call volume, latency, error rate and risk mix at a glance.
- **Devices** — router connectivity, system health (CPU / memory / disk) and SSH pool state.
- **Clients** — LAN devices on a router with live traffic; block / allow, pin an IP and
  apply rate limits inline.
- **Packet Capture** — live decoded TZSP capture with protocol and top-talker breakdowns
  and pcap export.
- **RADIUS & UM** — RADIUS client and User Manager: users, profiles, limitations, NAS and
  active sessions with full CRUD.
- **Topology** — configured devices and discovered Layer-2 neighbours (MNDP / CDP / LLDP).
- **Snapshots** — browse stored config snapshots and time-travel diff any two.
- **Drift Guard** — golden-config baselines and live per-device drift detection.
- **Change Plan** — dry-run intended RouterOS commands, risk-scored and safely ordered
  before anything touches a device.
- **S3 Backups** — list, download and delete S3 backup objects.
- **Backups** — local config vault: create, download, rename, restore and delete.
- **Modules** — enable / disable tool modules to curate the exposed MCP surface.
- **Config** — effective configuration with a safe editor (validate → preview → timed
  safe-apply), version history and a schema-driven field guide.
- **Reload Server** — reload the MCP server: reload its config live (zero-downtime,
  picks up newly added or edited devices immediately) or fully restart the process
  (it self-relaunches and rebinds in ~1.5 s — no external supervisor needed), with a
  confirmation before the restart.
- **Memory** — knowledge graph of entities, relations, observations and activity.
- **Live Feed** — every MCP tool call in real time over WebSocket, with an SSE fallback.

### Highlights

- Real-time streaming (WebSocket with SSE fallback) plus live client-traffic and
  packet polling.
- Native config editor with validate / preview / timed auto-revert safe-apply, so a bad
  change rolls itself back if it isn't confirmed.
- Every destructive action — client blocks, RADIUS/UM deletes, backup restores, drift
  baseline changes — is gated behind an explicit confirmation.
- Reload or restart the MCP server straight from Raycast — a live config reload with no
  downtime, or a self-relaunching process restart that needs no external supervisor.
- Built entirely on the Raycast UI kit and design guidelines, with native charts,
  slide-over detail sheets and menu-bar rendering.
- Configurable dashboard URL and optional bearer-token authentication via extension
  preferences.
