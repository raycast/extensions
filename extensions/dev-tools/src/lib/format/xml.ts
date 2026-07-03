import xmlPlugin from "@prettier/plugin-xml";
import type { FormatOptions } from "../format-options";
import { runPrettier } from "./prettier-common";

export function formatXml(code: string, options: FormatOptions): Promise<string> {
  // `xmlWhitespaceSensitivity: "ignore"` lets indentation/printWidth reflow the
  // document (it's a @prettier/plugin-xml option, outside prettier's core type).
  return runPrettier(code, "xml", [xmlPlugin], options, { xmlWhitespaceSensitivity: "ignore" });
}
