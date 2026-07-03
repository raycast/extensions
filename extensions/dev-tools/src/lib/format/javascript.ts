import * as babel from "prettier/plugins/babel";
import * as estree from "prettier/plugins/estree";
import type { FormatOptions } from "../format-options";
import { runPrettier } from "./prettier-common";

export function formatJavascript(code: string, options: FormatOptions): Promise<string> {
  return runPrettier(code, "babel", [babel, estree], options);
}
