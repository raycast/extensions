import { launchAgent } from "../cursor";
import { refreshMenuBar } from "../utils";

type Input = {
  /**
   * The task or instructions for the agent to execute.
   *
   * @example "Write a blog post about the latest trends in AI"
   */
  prompt: string;
  /**
   * The repository to work on, must be a GitHub url, e.g. https://github.com/raycast/extensions
   *
   * @remarks Use the `get-repositories` tool to get the list of all available repositories.
   */
  repository: string;
  /**
   * The Git ref (branch/tag) to use as the base branch, e.g. "main" or "v1.0.0". If not specified uses default branch of the repository.
   */
  ref?: string;
};

export default async function tool(input: Input) {
  const agent = await launchAgent({
    prompt: { text: input.prompt },
    source: { repository: input.repository, ref: input.ref },
  });

  await refreshMenuBar();

  return `Agent launched with id: ${agent.id}. User can follow the progress at ${agent.target.url}`;
}
