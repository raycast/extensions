import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_SMITHERY_EXECUTABLE } from "../constants/commands";
import { runCommand } from "./exec";

type SmitheryPreferences = {
  smitheryExecutable?: string;
};

export function getSmitheryExecutable(): string {
  const preferences = getPreferenceValues<SmitheryPreferences>();
  const executable = preferences.smitheryExecutable?.trim();
  return executable ? executable : DEFAULT_SMITHERY_EXECUTABLE;
}

export async function runSmitheryCommand(
  args: string[],
  options?: Parameters<typeof runCommand>[2],
) {
  return runCommand(getSmitheryExecutable(), args, options);
}

/**
 * Run a Smithery CLI command that mutates state (install / uninstall).
 *
 * After a successful mutation, the CLI may show an interactive inquirer prompt
 * asking whether to restart the target client. Because this extension runs the
 * CLI non-interactively (via execFile with piped stdio), inquirer would block
 * forever on the empty stdin pipe if no input is provided.
 *
 * Passing `input: "n\n"` pipes "No" to stdin, answering the restart prompt and
 * allowing the process to exit cleanly.
 */
export async function runSmitheryMutation(
  args: string[],
  options?: Parameters<typeof runSmitheryCommand>[1],
) {
  return runSmitheryCommand(args, {
    ...options,
    input: "n\n",
  });
}
