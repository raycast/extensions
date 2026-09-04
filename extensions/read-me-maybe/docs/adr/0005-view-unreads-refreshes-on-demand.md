# View Unreads refreshes on demand

Supersedes ADR-0004 (View Unreads reads the retained Unread Snapshot).

Opening View Unreads now runs one background Dock scan for the enabled Sources and renders its result, replacing the stale-until-next-cycle behavior. The scan runs through the same Dock-scan seam and coordinator pattern as the menu's refresh cycle, and the view persists the result to the Unread Snapshot — stamped with its read time — so the menu and the view keep showing the same per-Source statuses. The snapshot is therefore written by both surfaces' scans and read by the view.

The view stays out of the permission machinery: it reads the Setup Gate and refreshes only while the gate is open — the permissions granted in the menu's Check Access are what keep the on-demand scan free of macOS consent prompts — and it never writes Access Check State. A permission loss during the view's refresh is persisted as the failure state the scan produced; the menu's next cycle owns the gate transition. While the view stays open it re-polls the snapshot every 30s, exactly as before, so the menu's cycle keeps refreshing it without a second scan schedule.

## Considered Options

- Keeping ADR-0004's read-only view left rows stale by up to a menu cycle and showed Not scanned yet until the menu's first background scan; the view is the surface the user opens to read statuses, so staleness is felt there first.
- A live scan with no gate check would be freshest in every state but could surface an unexpected Automation consent dialog from a surface that never promised one, disturbing the Setup Gate's user-initiated contract.

## Consequences

- View Unreads rows are fresh at open whenever setup has completed; before setup, or with no Sources enabled, the view renders the retained snapshot or the not-scanned statuses as before.
- The Unread Snapshot gains a second writer; the menu's refresh cycle remains the only surface that transitions the Setup Gate or the Access Check Status.
- A scan's latency (up to the 10s background timeout) now sits between opening the view and its rows refreshing; the retained snapshot renders immediately underneath a loading indicator.
