import { aiListProjects } from "../lib/ai-projects";
import { withAiConnection } from "../lib/ai-runtime";

type Input = {
  /** Optional case-insensitive substring of the project name. Omit to list all projects. */
  query?: string;
};

export default async function tool(input: Input) {
  return withAiConnection((config) => aiListProjects(config, input.query));
}
