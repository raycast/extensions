import { showHUD } from "@raycast/api";
import React from "react";
import { triggerAllWorkFlowsCLI } from "./utils/n8n-cli-utils";

export default async () => {
  await showHUD("Activating all workflows...");
  const result = await triggerAllWorkFlowsCLI(true);
  await showHUD(result);
};
