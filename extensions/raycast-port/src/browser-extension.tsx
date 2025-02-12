import { execSync } from "node:child_process";
import { BrowserExtension, getPreferenceValues, open } from "@raycast/api";
import { LaunchOptions, callbackLaunchCommand } from "raycast-cross-extension";
import { appendError } from "./utils.js";

type LaunchContext = {
  getContent?: boolean | Parameters<typeof BrowserExtension.getContent>;
  getTabs?: boolean;
  callbackOpen?: Parameters<typeof open>;
  callbackExec?: Parameters<typeof execSync>;
  callbackLaunchOptions?: LaunchOptions;
};

type Result = {
  content?: string;
  tabs?: string | Awaited<ReturnType<typeof BrowserExtension.getTabs>>;
  errors?: string[];
};

export default async function Api({ launchContext = {} }: { launchContext: LaunchContext }) {
  const { getContent = true, getTabs, callbackOpen, callbackExec, callbackLaunchOptions } = launchContext;
  const { enableExecuteShellSupport } = getPreferenceValues<ExtensionPreferences>();

  const result: Result = {};

  if (getContent) {
    try {
      const content = await BrowserExtension.getContent(...(getContent === true ? [] : getContent));
      result.content = content;
    } catch (error) {
      appendError(result, "BrowserExtension.getContent()", error);
    }
  }

  if (getTabs) {
    try {
      const tabs = await BrowserExtension.getTabs();
      result.tabs = tabs;
    } catch (error) {
      appendError(result, "BrowserExtension.getTabs()", error);
    }
  }

  if (callbackOpen) {
    try {
      await open(
        callbackOpen[0].replace("RAYCAST_PORT_BROWSER_EXTENSION_RESULT", encodeURIComponent(JSON.stringify(result))),
        callbackOpen[1],
      );
    } catch (error) {
      appendError(result, "open()", error);
    }
  }

  if (callbackExec) {
    if (enableExecuteShellSupport) {
      try {
        process.env.RAYCAST_PORT_BROWSER_EXTENSION_RESULT = JSON.stringify(result);
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
      await callbackLaunchCommand(callbackLaunchOptions, { result });
    } catch (error) {
      appendError(result, "callbackLaunchCommand()", error);
    }
  }
}
