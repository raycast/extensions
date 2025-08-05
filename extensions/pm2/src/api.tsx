import { LaunchProps } from "@raycast/api";
import { StartOptions } from "pm2";
import { LaunchOptions, callbackLaunchCommand } from "raycast-cross-extension";
import { checkIfNeedSetup, runPm2Command } from "./utils.js";
import { Pm2Command, Pm2Process, RuntimeOptions } from "./types.js";

type LaunchContext = {
  command?: Pm2Command;
  options?: StartOptions | Pm2Process;
  runtimeOptions?: RuntimeOptions;
  callbackLaunchOptions?: LaunchOptions;
};

export default async function Api({ launchContext = {} }: LaunchProps<{ launchContext?: LaunchContext }>) {
  const { command, options, runtimeOptions, callbackLaunchOptions } = launchContext;

  if (command && options !== undefined) {
    await checkIfNeedSetup();

    // @ts-expect-error: The input is fine here.
    await runPm2Command(command, options, runtimeOptions);

    if (callbackLaunchOptions) {
      await callbackLaunchCommand(callbackLaunchOptions);
    }
  }
}
