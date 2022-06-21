import { showHUD } from "@raycast/api";
import React from "react";
import { triggerAllWorkFlowsCLI } from "./utils/n8n-cli-utils";

export default async () => {
  await showHUD("Deactivating all workflows...");
  const result = await triggerAllWorkFlowsCLI(false);
  await showHUD(result);
};
