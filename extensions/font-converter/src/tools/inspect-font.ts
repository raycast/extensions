import { inspectFont } from "../lib/fonts";

type Input = {
  /** Exact absolute path to an existing TTF, OTF, WOFF, WOFF2, or EOT font file. */
  filePath: string;
};

/** Read a local font's family, style, weight, format, outlines, glyph count, version, and copyright without changing the file. */
export default async function tool(input: Input) {
  return inspectFont(input.filePath);
}
