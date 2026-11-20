import type { Tool } from "@raycast/api";
import { aiProjectAction } from "../lib/ai-projects";
import { projectConfirmation, withAiConnection } from "../lib/ai-runtime";

type Input = {
  /** Exact source project ID from list-projects. Requires Edits' home screen. */
  projectId: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  projectConfirmation(input.projectId, "Create a copy of this Edits project?");

export default async function tool(input: Input) {
  return withAiConnection((config) =>
    aiProjectAction(config, { action: "duplicateProject", projectId: input.projectId }),
  );
}
