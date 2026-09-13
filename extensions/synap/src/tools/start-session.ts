import { createFocusSession, requireAgentConnection } from "../api/client";
import { getConnection } from "../utils/preferences";
import { getFocus } from "../utils/focus";
import { openUrl as portableOpen } from "../utils/deeplinks";
import { parseJsonArray } from "./property-json";

type Input = {
  /** ONE short line — a single outcome-oriented sentence. Not a paragraph. */
  goal: string;
  /** Workspace UUID. Provide this OR projectId (or rely on an explicit Raycast focus). */
  workspaceId?: string;
  /** Project UUID. Provide this OR workspaceId. Project-scoped needs no workspace membership. */
  projectId?: string;
  /** Optional idempotency key — same key for same user+workspace returns the existing session. */
  correlationId?: string;
  /**
   * Optional deliverables as a JSON array string: [{kind, label, icon?, status?}].
   * Put detail here so the goal stays one line.
   */
  expectedOutputs?: string;
};

/**
 * Declare "I'm starting work on X" as a focus session. This is not the session
 * runtime — Raycast does not run the desk. Always bounce with the /open link.
 */
export default async function tool(input: Input) {
  await requireAgentConnection();

  const goal = input.goal.trim();
  if (!goal) {
    return { executed: false, needsClarification: true, message: "goal is required — one short outcome line." };
  }

  const focus = await getFocus();
  const workspaceId = input.workspaceId?.trim() || focus?.workspaceId;
  const projectId = input.projectId?.trim();
  if (!workspaceId && !projectId) {
    return {
      executed: false,
      needsClarification: true,
      message:
        "A session needs a workspace or a project. Ask the user which, or have them Set Synap Focus, then retry. Do not invent a workspace.",
    };
  }

  const expectedOutputs = parseJsonArray(input.expectedOutputs, "expectedOutputs") as
    | Array<{ kind: string; label: string; icon?: string; status?: "pending" | "done" }>
    | undefined;

  const result = await createFocusSession({
    goal,
    workspaceId,
    projectId,
    correlationId: input.correlationId,
    expectedOutputs,
  });

  const conn = await getConnection();
  const pod = conn?.podUrl.replace(/\/$/, "") ?? "";

  if ("id" in result && typeof result.id === "string") {
    const openUrl = pod ? portableOpen(pod, result.id) : undefined;
    return {
      status: "started" as const,
      id: result.id,
      goal: result.goal ?? goal,
      workspaceId: result.workspaceId,
      projectId: result.projectId,
      openUrl,
      message: openUrl
        ? `Started session **${goal}**. Open: ${openUrl}`
        : `Started session **${goal}** (id: ${result.id}).`,
    };
  }

  const reviewUrl = result.reviewUrl;
  return {
    status: "proposed" as const,
    proposalId: result.proposalId,
    reviewUrl,
    openUrl: reviewUrl,
    goal,
    message: reviewUrl
      ? `Queued session **${goal}** for review. Open: ${reviewUrl}`
      : `Queued session **${goal}** for review (proposalId: ${result.proposalId ?? "unknown"}).`,
  };
}
