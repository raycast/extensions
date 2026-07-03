import type { MinifyOptions } from "../minify-options";
import { runTerser } from "./terser-common";

export function minifyJavascript(code: string, options: MinifyOptions): Promise<string> {
  if (!code.trim()) return Promise.resolve("");
  return runTerser(code, options);
}
