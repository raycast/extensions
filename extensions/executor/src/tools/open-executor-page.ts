import { open, type Tool } from "@raycast/api";
import { execute, origin } from "../lib/client";
import { connectionHandoffCode, handoffFromExecution } from "../lib/connection-actions";
import { scopedConsoleUrl } from "../lib/console";
import { executionOutput } from "../lib/ai-tools";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID. */
  workspaceId: string;
  page: "dashboard" | "integrations" | "catalog" | "integration" | "policies" | "artifacts" | "artifact";
  /** Exact integration slug or artifact ID for its detail page. Omit for other pages. */
  identifier?: string;
};

function path(input: Input): string {
  if (input.page === "integration" || input.page === "artifact") {
    const id = input.identifier?.trim();
    if (!id || id === "." || id === ".." || /[/\\?#]/.test(id))
      throw new Error("Provide the exact integration slug or artifact ID.");
    return `/${input.page === "integration" ? "integrations" : "artifacts"}/${encodeURIComponent(id)}`;
  }
  if (input.identifier !== undefined) throw new Error("This page does not take an identifier.");
  switch (input.page) {
    case "dashboard":
      return "/";
    case "integrations":
      return "/integrations";
    case "catalog":
      return "/integrations/browse";
    case "policies":
      return "/policies";
    case "artifacts":
      return "/artifacts";
    default:
      throw new Error("Unknown Executor page.");
  }
}

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => ({
    message: "Open this workspace's Executor page in your browser?",
    info: [{ name: "Page", value: path(input) }],
  }));

/** Open the same workspace-scoped console pages as native Open in Executor actions. This only opens a page, not a management action. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, async () => {
    const target = path(input);
    const result = await execute(connectionHandoffCode({ integration: "executor" }));
    if (result.status === "paused") return executionOutput(result);
    const handoff = handoffFromExecution(result);
    if (!handoff) throw new Error("Executor did not identify this API key's workspace. No page was opened.");
    const url = scopedConsoleUrl(handoff.url, origin(), target);
    await open(url);
    return { status: "opened", url };
  });
}
