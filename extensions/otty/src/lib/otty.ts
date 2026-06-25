import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { promisify } from "node:util";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import {
  DEFAULT_OTTY_CLI_PATH,
  buildOpenDirectoryArgs,
  buildFinderDirectoryScriptArgs,
  buildOpenDirectoryTabArgs,
  buildRunCommandArgs,
  buildSshCommandArgs,
  normalizeSshTarget,
} from "./otty-core";

const execFileAsync = promisify(execFile);

export {
  DEFAULT_OTTY_CLI_PATH,
  buildOpenDirectoryArgs,
  buildFinderDirectoryScriptArgs,
  buildOpenDirectoryTabArgs,
  buildRunCommandArgs,
  normalizeSshTarget,
};

export function getConfiguredCliPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.ottyCliPath.trim() || DEFAULT_OTTY_CLI_PATH;
}

export async function assertExecutable(path: string): Promise<void> {
  try {
    await access(path, constants.F_OK | constants.X_OK);
  } catch {
    throw new Error(
      `Otty CLI not found or not executable at ${path}. Install Otty or update the Otty CLI Path preference.`,
    );
  }
}

export async function runOtty(
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<void> {
  const cliPath = getConfiguredCliPath();
  await assertExecutable(cliPath);
  await execFileAsync(cliPath, args, {
    env: { ...process.env, ...env },
  });
}

export async function runOttyCommand(
  label: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<void> {
  try {
    await runOtty(args, env);
    await showToast({ style: Toast.Style.Success, title: label });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: `${label} failed`,
      message,
    });
  }
}

export async function openOtty(): Promise<void> {
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/osascript",
      buildFinderDirectoryScriptArgs(),
    );
    const directory = stdout.trim();

    if (!directory) {
      throw new Error("Finder did not return a directory.");
    }

    await openDirectoryInTab(directory);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read Finder directory",
      message,
    });
  }
}

export async function openDirectoryInTab(directory: string): Promise<void> {
  try {
    await runOtty(buildOpenDirectoryTabArgs(directory));
    await showToast({
      style: Toast.Style.Success,
      title: "Opened Finder directory in Otty tab",
    });
  } catch {
    const command = buildOpenDirectoryArgs(directory);
    await runOttyCommand(
      "Opened Finder directory in new Otty window",
      command.args,
      command.env,
    );
  }
}

export async function openNewWindow(): Promise<void> {
  await runOttyCommand("Opened new Otty window", ["open"]);
}

export async function openNewTab(): Promise<void> {
  try {
    await runOtty(["tab", "new"]);
    await showToast({
      style: Toast.Style.Success,
      title: "Opened new Otty tab",
    });
  } catch {
    await runOttyCommand("Opened new Otty window", ["open"]);
  }
}

export async function openDirectory(directory: string): Promise<void> {
  const command = buildOpenDirectoryArgs(directory);
  await runOttyCommand("Opened directory in Otty", command.args, command.env);
}

export async function runShellCommand(command: string): Promise<void> {
  await runOttyCommand("Running command in Otty", buildRunCommandArgs(command));
}

export async function openSshTarget(input: string): Promise<void> {
  const target = normalizeSshTarget(input);

  await runOttyCommand(
    "Opening SSH in Otty",
    buildSshCommandArgs(target.value),
  );
}
