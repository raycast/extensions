// Wrapper for the minify commands. The per-language minifier function is passed
// in by the command file, so importing this never pulls in a minifier the command
// doesn't use (e.g. minify-sql doesn't bundle terser or html-minifier-terser).

import { CodeToolView, type OptionValues } from "./code-tool-view";
import type { Language } from "../lib/languages";
import type { MinifyOptions } from "../lib/minify-options";

type MinifyFn = (code: string, options: MinifyOptions) => Promise<string>;

export function MinifyView({ language, run }: { language: Language; run: MinifyFn }) {
  return (
    <CodeToolView
      operation="minify"
      language={language}
      transform={(code: string, options: OptionValues) => run(code, options as unknown as MinifyOptions)}
    />
  );
}
