import type { MinifyOptions } from "../minify-options";
import { minifySql as minifySqlString } from "../sql-minify";

export function minifySql(code: string, options: MinifyOptions): Promise<string> {
  return Promise.resolve(minifySqlString(code, { removeComments: options.removeComments }));
}
