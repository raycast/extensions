// Agents in herdr's panes, with herdr's own status (it detects agents through hooks or screen manifests). Same
// snapshot as the herdr places (tabs/sources/herdr.ts, which owns the protocol); jumping focuses the pane over
// herdr's socket, then the terminal running herdr comes forward (locate.ts; ADR-022, ADR-023).

import type { Agent, AgentContext, AgentSource, AgentStatus } from "../model";
import { herdrPlaceKey, readSnapshots, workspaceName, type Snapshot } from "../../tabs/sources/herdr";

export { focusPane } from "../../tabs/sources/herdr";

const STATUSES = new Set<AgentStatus>(["blocked", "working", "done", "idle", "unknown"]);

/** Agents in one session's snapshot. */
export function fromSnapshot(snapshot: Snapshot, socket: string): Agent[] {
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
        host: { kind: "herdr", socket, paneId: a.pane_id, label: `herdr › ${place}` },
        ...(a.tab_id ? { placeKey: herdrPlaceKey(snapshot, socket, a.tab_id) } : {}),
        ...(session ? { sessionIds: [session] } : {}),
      },
    ];
  });
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const herdr: AgentSource = {
  id: "herdr",
  list: async ({ platform }: AgentContext) =>
    (await readSnapshots(platform)).flatMap(({ socket, snapshot }) => fromSnapshot(snapshot, socket)),
};
