import { aiProjectAction } from "../lib/ai-projects";
import { withAiConnection } from "../lib/ai-runtime";

type Input = {
  /** Exact project ID from list-projects. Never invent an ID or substitute a project name. */
  projectId: string;
};

export default async function tool(input: Input) {
  return withAiConnection((config) => aiProjectAction(config, { action: "openProject", projectId: input.projectId }));
}
