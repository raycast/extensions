import type { Tool } from "@raycast/api";
import { aiProjectAction } from "../lib/ai-projects";
import { projectConfirmation, withAiConnection } from "../lib/ai-runtime";

type Input = {
  /** Exact project ID from list-projects. */
  projectId: string;
  /** New, nonempty project name requested by the user. */
  name: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  projectConfirmation(input.projectId, "Rename this Edits project?", [{ name: "New Name", value: input.name }]);

export default async function tool(input: Input) {
  return withAiConnection((config) =>
    aiProjectAction(config, { action: "renameProject", projectId: input.projectId, name: input.name }),
  );
}
