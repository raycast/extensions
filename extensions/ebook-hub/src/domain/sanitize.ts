const FENCE = /^\s*(```|~~~)/;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const INLINE_IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const REFERENCE_IMAGE = /!\[[^\]]*\]\[[^\]]*\]/g;
const HTML_TAG = /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>/g;
const UNSAFE_LINK = /\[([^\]]*)\]\(\s*(?:javascript|data|vbscript|file):(?:[^()]|\([^()]*\))*\)/gi;
/** `[ref]: javascript:…` defines a target for `[text][ref]` without ever writing `](`. */
const UNSAFE_DEFINITION = /^\s{0,3}\[[^\]]*\]:\s*(?:javascript|data|vbscript|file):/i;

function sanitizeLine(line: string): string {
  if (UNSAFE_DEFINITION.test(line)) {
    return "";
  }
  return line.replace(INLINE_IMAGE, "").replace(REFERENCE_IMAGE, "").replace(HTML_TAG, "").replace(UNSAFE_LINK, "$1");
}

/**
 * Remove content that could track readers or render unpredictably: raw HTML,
 * images (local and remote), and non-web links. Fenced code blocks are kept
 * verbatim. See ADR-0006.
 */
export function sanitizeMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").replace(HTML_COMMENT, "").split("\n");
  const output: string[] = [];
  let fenceMarker: string | null = null;

  for (const line of lines) {
    const fence = FENCE.exec(line);
    if (fence) {
      if (fenceMarker === null) {
        fenceMarker = fence[1];
      } else if (fence[1] === fenceMarker) {
        fenceMarker = null;
      }
      output.push(line);
      continue;
    }
    output.push(fenceMarker === null ? sanitizeLine(line) : line);
  }

  return output
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
