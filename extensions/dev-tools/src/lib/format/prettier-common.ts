// Shared Prettier driver. This module imports only `prettier/standalone` (the
// core), NOT any parser plugins — each language module imports just the plugins
// it needs and passes them in, so a command's bundle only carries its own parser.

import { format as formatStandalone } from "prettier/standalone";
import type { Options as PrettierOptions, Plugin } from "prettier";
import type { FormatOptions } from "../format-options";

export async function runPrettier(
  code: string,
  parser: string,
  plugins: Plugin[],
  options: FormatOptions,
  extra?: Record<string, unknown>,
): Promise<string> {
  if (!code.trim()) return "";
  const prettierOptions: PrettierOptions = {
    parser,
    plugins,
    tabWidth: options.indentSize,
    useTabs: options.indentStyle === "tab",
    printWidth: options.printWidth,
    singleQuote: options.quotes === "single",
    semi: options.semicolons,
    trailingComma: options.trailingComma,
    proseWrap: options.proseWrap,
  };
  if (extra) Object.assign(prettierOptions, extra);
  return formatStandalone(code, prettierOptions);
}
