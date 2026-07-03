import type { MinifyOptions } from "../minify-options";
import { minifyXml as minifyXmlString } from "../xml-minify";

export function minifyXml(code: string, options: MinifyOptions): Promise<string> {
  return Promise.resolve(minifyXmlString(code, { removeComments: options.removeComments }));
}
