import path from "node:path";
import fs from "node:fs";
import { environment } from "@raycast/api";

export function toUpperCamelCase(string: string) {
  const camelCaseString = string.replaceAll(/[-_]\w/gi, (match) =>
    match[1].toUpperCase(),
  );

  return camelCaseString.charAt(0).toUpperCase() + camelCaseString.slice(1);
}

export function readAssetFile(filePath: string) {
  const assetPath = path.join(environment.assetsPath, filePath);
  const content = fs.readFileSync(assetPath, "utf-8");
  return content;
}
