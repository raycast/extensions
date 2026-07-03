import { transform } from "sucrase";
import type { MinifyOptions } from "../minify-options";
import { runTerser } from "./terser-common";

export function minifyTypescript(code: string, options: MinifyOptions): Promise<string> {
  if (!code.trim()) return Promise.resolve("");
  // Strip TypeScript types with sucrase (tiny, pure JS) before terser minifies.
  const js = transform(code, { transforms: ["typescript"], disableESTransforms: true }).code;
  return runTerser(js, options);
}
