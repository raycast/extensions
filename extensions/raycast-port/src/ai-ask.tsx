import { AI, getPreferenceValues, open } from "@raycast/api";
import { execSync } from "node:child_process";
import { LaunchOptions, callbackLaunchCommand } from "raycast-cross-extension";

type LaunchContext = {
  askPrompt?: string;
  askOptions?: AI.AskOptions;
  callbackOpen?: Parameters<typeof open>;
  callbackExec?: Parameters<typeof execSync>;
  callbackLaunchOptions?: LaunchOptions;
};

export default async function Api({ launchContext = {} }: { launchContext: LaunchContext }) {
  const { askPrompt, askOptions, callbackOpen, callbackExec, callbackLaunchOptions } = launchContext;
  const { enableExecuteShellSupport } = getPreferenceValues<ExtensionPreferences>();
  if (!askPrompt) return;

  const answer = await AI.ask(askPrompt, askOptions);

  if (callbackOpen) {
    await open(callbackOpen[0].replace("RAYCAST_PORT_AI_ANSWER", encodeURIComponent(answer)), callbackOpen[1]);
  }

  if (enableExecuteShellSupport && callbackExec) {
    process.env.RAYCAST_PORT_AI_ANSWER = answer;
    execSync(...callbackExec);
  }

  if (callbackLaunchOptions) {
    await callbackLaunchCommand(callbackLaunchOptions, { answer });
  }
}
