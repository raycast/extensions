import { Tool } from "@raycast/api";
import { displayCommand, requireMise, runForAI, upgradeOperation } from "../ai/tools";

type Input = {
  /**
   * One tool to upgrade, such as `node`. Leave it out to upgrade every outdated global tool.
   */
  tool?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const op = upgradeOperation(await requireMise(), input.tool);
  return {
    message: input.tool?.trim()
      ? `Upgrade ${input.tool.trim()}?`
      : `Upgrade every outdated ${op.args.includes("--global") ? "global " : ""}tool?`,
    info: [{ name: "Command", value: displayCommand(op) }],
  };
};

/**
 * Upgrades one tool, or every outdated global tool, with `mise upgrade`. Like Upgrade All Tools it
 * passes --global when mise supports it, and --bump when the Upgrade past the configured range
 * preference is on. It never removes the replaced versions.
 */
export default async function tool(input: Input) {
  const location = await requireMise();
  return runForAI(location, upgradeOperation(location, input.tool));
}
