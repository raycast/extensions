// Agents in herdr's panes, with herdr's own status (it detects agents through hooks or screen manifests). Same
// snapshot as the herdr places (tabs/sources/herdr.ts, which owns the protocol): each agent's host is the herdr
// tab showing its pane, listed under the terminal running herdr's client; the tab source focuses the pane
// (ADR-022, ADR-023, ADR-028).

import type { App } from "../../platform/model";
import type { Agent, AgentContext, AgentSource, AgentStatus } from "../model";
import { unknownStatuses } from "../status";
import {
  clientOf,
  herdrPlaceKey,
  herdrWorkspaceKey,
  readSnapshots,
  workspaceName,
  type Snapshot,
} from "../../tabs/sources/herdr";

const STATUSES: ReadonlySet<string> = new Set<AgentStatus>(["blocked", "working", "done", "idle", "unknown"]);

/** Agents in one session's snapshot; `app` runs the session's client (undefined: none in a known app). */
export function fromSnapshot(snapshot: Snapshot, socket: string, app?: App): Agent[] {
  return (snapshot.agents ?? []).flatMap((a): Agent[] => {
    if (!a.pane_id) return [];
    const product = a.display_agent || a.agent || "Agent";
    const status = STATUSES.has(a.agent_status as AgentStatus) ? (a.agent_status as AgentStatus) : "unknown";
    const tab = snapshot.tabs?.find((t) => t.tab_id === a.tab_id);
    const tabName = tab?.label && !/^\d+$/.test(tab.label) ? tab.label : undefined;
    const place = [workspaceName(snapshot, a.workspace_id), tabName].filter(Boolean).join(" › ");
    const session = a.agent_session?.kind === "id" ? a.agent_session.value : undefined;
    return [
      {
        key: `herdr:${socket}:${a.pane_id}`,
        source: herdr.id,
        product: capitalize(product),
        id: session ?? a.pane_id,
        title: a.name || a.title || a.terminal_title_stripped || place,
        cwd: a.foreground_cwd || a.cwd,
        status,
        host: {
          kind: "place",
          // Its tab's entry, else its workspace's; neither known: matches no tab, and only the terminal comes forward.
          tabKey:
            (a.tab_id && herdrPlaceKey(snapshot, socket, a.tab_id)) ||
            (a.workspace_id ? herdrWorkspaceKey(socket, a.workspace_id) : ""),
          paneId: a.pane_id,
          ...(app ? { bundleId: app.bundleId } : {}),
          label: `herdr › ${place}`,
        },
        ...(session ? { sessionIds: [session] } : {}),
      },
    ];
  });
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const herdr: AgentSource = {
  id: "herdr",
  list: async ({ platform, processes, apps }: AgentContext) => {
    const snapshots = await readSnapshots(platform);
    // A status herdr added shows as "unknown": worth knowing about.
    const statuses = snapshots.flatMap(({ snapshot }) => (snapshot.agents ?? []).map((a) => a.agent_status));
    const unknown = unknownStatuses("herdr agent", statuses, STATUSES);
    if (unknown) platform.reportError(unknown, "agents: herdr status");
    return snapshots.flatMap(({ socket, snapshot }) =>
      fromSnapshot(snapshot, socket, clientOf(socket, processes, apps)?.app),
    );
  },
};
