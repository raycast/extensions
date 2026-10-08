import { open, showToast, Toast } from "@raycast/api";
import { checkProxymanAppInstallation } from "./utils";

export const ProxymanActions = {
  ToggleSystemProxy: "ToggleSystemProxy",
  ToggleMapLocal: "ToggleMapLocal",
  ToggleBreakpoint: "ToggleBreakpoint",
  ToggleBlocklist: "ToggleBlocklist",
  ToggleAllowlist: "ToggleAllowlist",
  ToggleMapRemote: "ToggleMapRemote",
  ToggleScripting: "ToggleScripting",
  ToggleExternalProxy: "ToggleExternalProxy",
  ToggleSOCKSProxy: "ToggleSOCKSProxy",
  ToggleNetworkCondition: "ToggleNetworkCondition",
  ToggleSSLProxyingList: "ToggleSSLProxyingList",
  ToggleRecordTraffic: "ToggleRecordTraffic",
  ClearSession: "ClearSession",
} as const;

export type ProxymanActionType = (typeof ProxymanActions)[keyof typeof ProxymanActions];

async function runSchemaAction(action: ProxymanActionType) {
  const uri = `proxyman://action?name=${action}`;
  await open(uri);
}

export async function performAction(action: ProxymanActionType, successTitle: string, errorTitle: string) {
  try {
    const isInstalled = await checkProxymanAppInstallation();
    if (!isInstalled) {
      return;
    }

    await runSchemaAction(action);

    await showToast({
      style: Toast.Style.Success,
      title: successTitle,
    });
  } catch (error) {
    console.error(`Error: ${errorTitle}`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: errorTitle,
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}
