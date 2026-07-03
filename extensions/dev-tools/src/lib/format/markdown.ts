import * as markdown from "prettier/plugins/markdown";
import type { FormatOptions } from "../format-options";
import { runPrettier } from "./prettier-common";

export function formatMarkdown(code: string, options: FormatOptions): Promise<string> {
  return runPrettier(code, "markdown", [markdown], options);
}
