// CSS, SCSS, and Less all use Prettier's postcss plugin (different parser names),
// so one module serves all three commands.
import * as postcss from "prettier/plugins/postcss";
import type { FormatOptions } from "../format-options";
import { runPrettier } from "./prettier-common";

export function formatCss(code: string, options: FormatOptions): Promise<string> {
  return runPrettier(code, "css", [postcss], options);
}

export function formatScss(code: string, options: FormatOptions): Promise<string> {
  return runPrettier(code, "scss", [postcss], options);
}

export function formatLess(code: string, options: FormatOptions): Promise<string> {
  return runPrettier(code, "less", [postcss], options);
}
