import * as yaml from "js-yaml";
import { readFileSync } from "fs";
import { YamlFile } from "./UrlInfo";

export function readAndParseYaml(filePath: string): YamlFile | undefined {
  try {
    const yamlContent = readFileSync(filePath, "utf8");
    return yaml.load(yamlContent) as YamlFile;
  } catch (error) {
    console.warn(`Error reading YAML file: ${filePath}`, error);
    return undefined;
  }
}
