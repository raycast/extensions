import { readdirSync, readFileSync } from "fs";
import * as yaml from "js-yaml";
import path from "path";

import { Task, YamlFile } from "./interface";

const END_WITH = "-chrome-taskfile.yaml";
export function convertYamlToJson(folderPath: string): string {
  console.log("Converting YAML to JSON");

  try {
    const yamlFiles = getYamlFiles(folderPath);
    console.log("Processing YAML files:", yamlFiles);

    const namespace2task: { [key: string]: { [key: string]: Task } } = {};
    yamlFiles.forEach((fileName) => processYamlFile(folderPath, fileName, namespace2task));

    return JSON.stringify(convertToUrlData(namespace2task));
  } catch (error) {
    console.error("Error processing YAML files:", error);
    return JSON.stringify([]);
  }
}

// Helper Functions
function getYamlFiles(folderPath: string): string[] {
  return readdirSync(folderPath).filter((file) => file.endsWith(END_WITH));
}
function convertToUrlData(namespace2task: { [key: string]: { [key: string]: Task } }): unknown[] {
  return Object.entries(namespace2task).map(([namespace, tasks]) => ({
    namespace,
    urlsData: Object.entries(tasks).map(([taskName, task]) => ({
      title: taskName,
      description: task.desc || null,
      icon: task.vars?.icon || "🔍",
      url: task.vars?.URL,
    })),
  }));
}

function processYamlFile(
  folderPath: string,
  fileName: string,
  accumulator: { [key: string]: { [key: string]: Task } },
) {
  const filePath = path.join(folderPath, fileName);
  const parsedYaml = readAndParseYaml(filePath);

  if (!parsedYaml || !parsedYaml.vars || !parsedYaml.tasks) {
    console.warn(`Skipping invalid YAML file: ${fileName}`);
    return;
  }

  const namespace = parsedYaml.vars.namespace || fileName.replace(END_WITH, "");
  accumulator[namespace] = { ...accumulator[namespace], ...parsedYaml.tasks };
}

export function readAndParseYaml(filePath: string): YamlFile | undefined {
  try {
    const yamlContent = readFileSync(filePath, "utf8");
    return yaml.load(yamlContent) as YamlFile;
  } catch (error) {
    console.warn(`Error reading YAML file: ${filePath}`, error);
    return undefined;
  }
}
