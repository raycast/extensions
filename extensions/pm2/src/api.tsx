import { LaunchProps } from "@raycast/api";
import { StartOptions } from "pm2";
import { LaunchOptions, callbackLaunchCommand } from "raycast-cross-extension";
import { runPm2Command } from "./utils.js";
import { Pm2Command, Pm2Process } from "./types.js";

type LaunchContext = {
  command?: Pm2Command;
  options?: StartOptions | Pm2Process;
  callbackLaunchOptions?: LaunchOptions;
};

export default async function Api({ launchContext = {} }: LaunchProps<{ launchContext?: LaunchContext }>) {
  const { command, options, callbackLaunchOptions } = launchContext;

  if (command && options !== undefined) {
    // @ts-expect-error: The input is fine here.
    await runPm2Command(command, options, runtimeOptions);

    if (callbackLaunchOptions) {
      await callbackLaunchCommand(callbackLaunchOptions);
    }
  }
}
