import * as yaml from "prettier/plugins/yaml";
import type { FormatOptions } from "../format-options";
import { runPrettier } from "./prettier-common";

export function formatYaml(code: string, options: FormatOptions): Promise<string> {
  // YAML indentation must be spaces — tabs are illegal in YAML.
  return runPrettier(code, "yaml", [yaml], options, { useTabs: false });
}
