// Wrapper for the format commands. The per-language formatter function is passed
// in by the command file, so importing this never pulls in a parser the command
// doesn't use (each command bundles only its own Prettier plugins / sql-formatter).

import { CodeToolView, type OptionValues } from "./code-tool-view";
import type { Language } from "../lib/languages";
import type { FormatOptions } from "../lib/format-options";

type FormatFn = (code: string, options: FormatOptions) => Promise<string>;

export function FormatView({ language, run }: { language: Language; run: FormatFn }) {
  return (
    <CodeToolView
      operation="format"
      language={language}
      transform={(code: string, options: OptionValues) => run(code, options as unknown as FormatOptions)}
    />
  );
}
