// Minimal XML minifier. There is no Node built-in for this and a full DOM parse
// is overkill, so we collapse the whitespace that sits purely *between* tags
// (`>   <` -> `><`) and optionally drop comments, while leaving text-node
// content untouched.
//
// CDATA sections are protected verbatim (their interior may legitimately contain
// `<!-- -->` or `>  <`). Caveats: `xml:space="preserve"` is not honored, and a
// retained comment whose text contains a literal `>  <` may have that interior
// whitespace collapsed — acceptable for a developer convenience tool.

export interface XmlMinifyOptions {
  removeComments: boolean;
}

export function minifyXml(xml: string, options: XmlMinifyOptions): string {
  if (!xml.trim()) return "";

  const process = (segment: string): string => {
    let text = segment;
    if (options.removeComments) {
      text = text.replace(/<!--[\s\S]*?-->/g, "");
    }
    // Collapse runs of whitespace that are entirely between two tags.
    return text.replace(/>\s+</g, "><");
  };

  const cdata = /<!\[CDATA\[[\s\S]*?\]\]>/g;
  let out = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = cdata.exec(xml)) !== null) {
    out += process(xml.slice(lastIndex, match.index));
    out += match[0]; // CDATA preserved verbatim
    lastIndex = cdata.lastIndex;
  }
  out += process(xml.slice(lastIndex));

  return out.trim();
}
