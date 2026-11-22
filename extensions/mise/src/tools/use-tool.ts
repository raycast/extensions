import { Tool } from "@raycast/api";
import { displayCommand, requireMise, runForAI, useToolOperation } from "../ai/tools";

type Input = {
  /**
   * The tool to install: a registry name such as `node` or `ripgrep`, or a backend tool such as
   * `npm:prettier`, `cargo:ripgrep` or `github:cli/cli`. Without the version.
   */
  tool: string;
  /**
   * The version to request, such as `22`, `3.12` or `lts`. Defaults to `latest`. A partial version
   * like `22` keeps the tool on the newest 22.x.
   */
  version?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const op = useToolOperation(input.tool, input.version);
  return {
    message: `Install ${op.args[op.args.length - 1]} and add it to your global mise config?`,
    info: [
      { name: "Command", value: displayCommand(op) },
      { name: "Changes", value: "Your global mise config" },
    ],
  };
};

/**
 * Installs a tool and records it in the global mise config with `mise use -g <tool>@<version>`, as
 * Search Tools' Use Globally does.
 */
export default async function tool(input: Input) {
  return runForAI(await requireMise(), useToolOperation(input.tool, input.version));
}
