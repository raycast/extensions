import { AI, getPreferenceValues, open } from "@raycast/api";
import { execSync } from "node:child_process";
import { LaunchOptions, callbackLaunchCommand } from "raycast-cross-extension";
import { appendError } from "./utils.js";

type LaunchContext = {
  askPrompt?: string;
  askOptions?: AI.AskOptions;
  callbackOpen?: Parameters<typeof open>;
  callbackExec?: Parameters<typeof execSync>;
  callbackLaunchOptions?: LaunchOptions;
};

type Result = {
  answer?: string;
  errors?: string[];
};

export default async function Api({ launchContext = {} }: { launchContext: LaunchContext }) {
  const { askPrompt, askOptions, callbackOpen, callbackExec, callbackLaunchOptions } = launchContext;
  const { enableExecuteShellSupport } = getPreferenceValues<ExtensionPreferences>();
  if (!askPrompt) return;

  const result: Result = {};

  try {
    const answer = await AI.ask(askPrompt, askOptions);
    result.answer = answer;
  } catch (error) {
    appendError(result, "AI.ask()", error);
  }

  if (callbackOpen) {
    try {
      await open(
        callbackOpen[0]
          .replace("RAYCAST_PORT_AI_ANSWER", encodeURIComponent(result.answer || "")) // [Deprecated]
          .replace("RAYCAST_PORT_AI_ASK_RESULT", encodeURIComponent(JSON.stringify(result))),
        callbackOpen[1],
      );
    } catch (error) {
      appendError(result, "open()", error);
    }
  }

  if (callbackExec) {
    if (enableExecuteShellSupport) {
      try {
        process.env.RAYCAST_PORT_AI_ANSWER = result.answer || ""; // [Deprecated]
        process.env.RAYCAST_PORT_AI_ASK_RESULT = JSON.stringify(result);
        execSync(...callbackExec);
      } catch (error) {
        appendError(result, "execSync()", error);
      }
    } else {
      appendError(result, "callbackExec", "Shell support is disabled. Please enable it in the extension preferences.");
    }
  }

  if (callbackLaunchOptions) {
    try {
      await callbackLaunchCommand(callbackLaunchOptions, {
        answer: result.answer, // [Deprecated]
        result,
      });
    } catch (error) {
      appendError(result, "callbackLaunchCommand()", error);
    }
  }
}
