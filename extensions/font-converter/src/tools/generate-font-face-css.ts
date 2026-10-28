import { generateFontFaceCss } from "../lib/fonts";

type Input = {
  /** Exact absolute path to an existing TTF, OTF, WOFF, WOFF2, or EOT font file. */
  filePath: string;
};

/** Generate a CSS @font-face rule for a local font with its family, weight, style, and format. Return the CSS without copying it to the clipboard. */
export default async function tool(input: Input) {
  return { filePath: input.filePath, css: await generateFontFaceCss(input.filePath) };
}
