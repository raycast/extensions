# View Unreads reads the retained Unread Snapshot

> **Superseded by [ADR-0005](0005-view-unreads-refreshes-on-demand.md)** — View Unreads now refreshes on demand when opened. The access-flow boundaries below survive in ADR-0005.

Only the menu-bar command scans the Dock, and its refresh cycle persists every scan — including permission-failure states — to the Unread Snapshot with its read time. The View Unreads command renders that snapshot and never touches the Dock, the Setup Gate, or the permission flows; the explicit Check Access diagnostic keeps its never-retained contract and never writes the snapshot. One scanner keeps the access machinery in a single surface and makes the view's Last Updated time an honest fact about that scanner; the accepted cost is a view only as fresh as the menu's last cycle, showing placeholders until the first background scan.

## Considered Options

- A live scan on every view open is fresh but drags Setup Gate and Access Check transitions into a second surface, duplicates the Accessibility/Automation boundary, and adds scan latency to every open.
- A hybrid — snapshot when young, scan when stale — pays both costs and adds a staleness rule while remaining able to hide a permission breakage behind a stale-but-pretty view.

## Consequences

- The menu's refresh cycle owns a storage write per cycle; the view renders it without consulting the Setup Gate — a closed gate appears as the failure state the cycle persisted.
- A Check Access result reaches the view only after the next background cycle, since the diagnostic is never retained.
- The View Unreads command never prompts for Accessibility or Automation, so like Configure Sources before it, it cannot disturb the Setup Gate.
