import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { WorkflowConfigs } from "../types";
import { getPreferenceValues } from "@raycast/api";

export async function getWorkflowConfigs(): Promise<WorkflowConfigs> {
  const path = getWorkflowConfigPath();
  const content = fs.readFileSync(path, "utf-8");
  const doc = yaml.load(content);

  if (!doc) {
    throw new Error(`failed to parse workflow config file: ${path}`);
  }

  return doc as WorkflowConfigs;
}

interface Preferences {
  workflow: string;
}

function getWorkflowConfigPath(): string {
  const { workflow } = getPreferenceValues<Preferences>();
  if (!workflow) {
    throw new Error(
      "Please specify a workflow config file in the preferences, see https://github.com/godruoyi/imageflow for more details.",
    );
  }

  if (!fs.existsSync(workflow)) {
    throw new Error("Specified workflow config file not found, path: " + workflow);
  }

  const ext = path.extname(workflow);
  if (ext !== ".yaml" && ext !== ".yml") {
    throw new Error("Invalid workflow config file extension, only .yaml or .yml is supported");
  }

  return workflow;
}
