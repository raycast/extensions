import { diagnose } from "../api/client";

type Input = {
  /** Bare object id — auto-detect its kind (proposal/session/capability/run/agent/entity) and explain its state + why */
  id?: string;
  /** A diagnosable class as a health surface */
  type?: "proposal" | "session" | "capability" | "agent" | "entity" | "run";
  /** Agent behavioural scorecard for this agent id */
  agentId?: string;
  /** Per-run timeline — requires flowType */
  runId?: string;
  /** Filter to one flow ledger (run-feed / run-detail modes) */
  flowType?: "automation" | "playbook" | "capture" | "capability" | "session" | "chat";
  /** Back-compat: restrict the feed to one flow's runs */
  flowId?: string;
  /** Scope to a specific workspace ID. Omit for pod-wide. */
  workspaceId?: string;
  /** Max results (where applicable) */
  limit?: number;
};

/**
 * THE diagnose door. Reaches into what's happening / what's wrong across the
 * pod. Mode is derived from which field is set: no args → whole-pod health
 * (stuck runs, failed flows, review backlog, duplicate proposals, capability
 * approval state, agent activity) · `id` → auto-detect an object and explain
 * its state + why · `type` → a diagnosable class as a health surface ·
 * `agentId` → an agent's behavioural scorecard · `runId`+`flowType` → a single
 * run's timeline.
 *
 * Call this when the user asks "what's going on", "is anything stuck",
 * "why did X fail/get rejected", or "how is agent Y doing".
 */
export default async function tool(input: Input) {
  return diagnose({
    id: input.id,
    type: input.type,
    agentId: input.agentId,
    runId: input.runId,
    flowType: input.flowType,
    flowId: input.flowId,
    workspaceId: input.workspaceId,
    limit: input.limit,
  });
}
