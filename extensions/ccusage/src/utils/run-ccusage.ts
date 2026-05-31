import execa from "execa";
import { getCustomNpxPath, preferences } from "../preferences";
import { getExecOptions } from "./exec-options";

/**
 * Resolves the command + args used to invoke the ccusage CLI, honoring the
 * "use direct ccusage command" preference and any custom npx path.
 */
const buildCcusageCommand = (subcommandArgs: string[]): [file: string, args: string[]] => {
  if (preferences.useDirectCcusageCommand) {
    return ["ccusage", subcommandArgs];
  }
  const npxCommand = getCustomNpxPath() ?? "npx";
  return [npxCommand, ["ccusage@latest", ...subcommandArgs]];
};

/**
 * Runs the ccusage CLI via execa and returns stdout.
 *
 * execa uses cross-spawn, which resolves Windows `.cmd` shims through
 * `PATHEXT` and reads the PATH variable case-insensitively, so no shell or
 * platform-specific command assembly is needed here.
 */
export const runCcusage = async (subcommandArgs: string[]): Promise<string> => {
  const [file, args] = buildCcusageCommand(subcommandArgs);
  const { stdout } = await execa(file, args, getExecOptions());
  return stdout;
};
