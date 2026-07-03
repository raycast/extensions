import * as typescript from "prettier/plugins/typescript";
import * as estree from "prettier/plugins/estree";
import type { FormatOptions } from "../format-options";
import { runPrettier } from "./prettier-common";

export function formatTypescript(code: string, options: FormatOptions): Promise<string> {
  return runPrettier(code, "typescript", [typescript, estree], options);
}
