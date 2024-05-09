import { Data, Environment, Tool } from "./types";
import { parse }  from "json5"
import { join } from "path";
import { environment } from "@raycast/api";
import fs from "node:fs";

export function createUrl(tool: Tool, env: Environment): string {
  return env.overrides[tool.shortName] ? env.overrides[tool.shortName] : `https://${tool.serviceName}.${env.domain}/${tool.path}`;
}

export function getData(): Data {
  const filepath = join(environment.assetsPath + "/data.json5");
  return parse(fs.readFileSync(filepath, "utf8"));
}
