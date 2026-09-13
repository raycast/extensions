import { getActionBrief, getCapabilityCatalog } from "../api/client";

type Input = {
  /**
   * A list-actions verbId/tool, or a pack key. Hub teaching briefs are still
   * keyed by MCP synap_* names — a miss is found:false, not an error.
   */
  tool: string;
  /** Workspace ID used for the action catalog; a brief includes that workspace's governance. */
  workspaceId: string;
};

/** Load just-in-time usage and governance guidance for one runnable action. */
export default async function tool(input: Input) {
  const workspaceId = input.workspaceId?.trim();
  if (!workspaceId) {
    return {
      found: false as const,
      briefs: {},
      message: "workspaceId is required. Get it from orient after the user selects a lens. Do not invent a workspace.",
    };
  }

  const toolName = input.tool?.trim() ?? "";
  if (!toolName) {
    return {
      found: false as const,
      briefs: {},
      message: "tool is required — pass a name from list-actions, not a pack key.",
    };
  }

  const result = await getActionBrief({
    tools: [toolName],
    workspaceId,
    door: "chat",
  });

  const hasContent = Object.values(result.briefs).some(
    (content) => typeof content === "string" && content.trim().length > 0
  );
  if (hasContent) {
    return result;
  }

  const catalog = await getCapabilityCatalog({ workspaceId, extraKey: toolName });
  const needle = toolName.toLowerCase();
  const packMatch = catalog.capabilities.find(
    (card) => card.key.toLowerCase() === needle || card.name.toLowerCase() === needle
  );
  if (packMatch) {
    return {
      found: false as const,
      briefs: {},
      reason: "That is a pack key, not a runnable action name.",
      hint: "Use get-capability-brief. Runnable names come from list-actions.",
    };
  }

  return {
    found: false as const,
    briefs: {},
    reason: "No teaching brief for this name.",
    hint: "Pass a tool name from list-actions. Pack keys use get-capability-brief.",
  };
}
