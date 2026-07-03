import CleanCSS from "clean-css";
import type { MinifyOptions } from "../minify-options";

export function minifyCss(code: string, options: MinifyOptions): Promise<string> {
  if (!code.trim()) return Promise.resolve("");
  const levelOne = { specialComments: options.removeComments ? (0 as const) : ("all" as const) };
  // Object form so level-2 structural merges and the comment setting can both be
  // expressed (the numeric `level: 2` form can't carry options).
  const level = options.cssLevel === 2 ? { 1: levelOne, 2: {} } : { 1: levelOne };
  const result = new CleanCSS({ level }).minify(code);
  if (result.errors.length > 0) throw new Error(result.errors.join("\n"));
  return Promise.resolve(result.styles);
}
