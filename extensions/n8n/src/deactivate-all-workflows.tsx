import { showHUD } from "@raycast/api";
import { triggerAllWorkFlowsCLI } from "./utils/n8n-cli-utils";
import { appInstalled } from "./utils/common-utils";
import { appNotInstallAlertDialog } from "./hooks/hooks";

export default async () => {
  if (!appInstalled()) {
    await appNotInstallAlertDialog();
    return;
  }
  await showHUD("Deactivating all workflows...");
  const result = await triggerAllWorkFlowsCLI(false);
  await showHUD(result);
};
