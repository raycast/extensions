import type { Tool } from "@raycast/api";
import { aiProjectAction } from "../lib/ai-projects";
import { projectConfirmation, withAiConnection } from "../lib/ai-runtime";

type Input = {
  /** Exact project ID from list-projects. */
  projectId: string;
  /** Desired pinned state. Repeating the same desired state does not toggle it back. */
  isPinned: boolean;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  projectConfirmation(input.projectId, "Update this project's pinned status?", [
    { name: "Pinned", value: input.isPinned ? "Yes" : "No" },
  ]);

export default async function tool(input: Input) {
  return withAiConnection((config) =>
    aiProjectAction(config, { action: "togglePin", projectId: input.projectId, enabled: input.isPinned }),
  );
}
