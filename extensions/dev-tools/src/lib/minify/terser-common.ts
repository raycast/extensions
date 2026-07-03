// Shared terser runner, used by the JavaScript and TypeScript minifiers.
import { minify } from "terser";
import type { MinifyOptions } from "../minify-options";

export async function runTerser(code: string, options: MinifyOptions): Promise<string> {
  const result = await minify(code, {
    mangle: options.mangle,
    compress: options.compress
      ? { drop_console: options.dropConsole, drop_debugger: options.dropDebugger, dead_code: true }
      : false,
    format: { comments: options.removeComments ? false : "some" },
  });
  return result.code ?? "";
}
