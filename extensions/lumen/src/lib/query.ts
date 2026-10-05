// Tokenizes a scoped query into its grammar parts. Tokenization rules:
//   --word(,arg)  -> order command (one active; resolved against the order tools)
//   .word         -> extension filter (OR)
//   -word / -     -> category code (OR); a lone "-" still signals file intent
//   anything else -> fuzzy term (AND), including mid-token hyphens (aserradero-madrid)
export interface ParsedQuery {
  terms: string[];
  exts: string[]; // lowercase, no leading dot
  cats: string[]; // category codes, lowercase
  cmd: { name: string; args: string[] } | null; // --code,arg1,arg2 (args order-free, ANDed)
  filesIntent: boolean; // a "-" or ".ext" was typed => the user is after files
}

export function parseQuery(raw: string): ParsedQuery {
  const terms: string[] = [];
  const exts: string[] = [];
  const cats: string[] = [];
  let cmd: ParsedQuery["cmd"] = null;
  let filesIntent = false;

  for (const token of raw.split(/\s+/)) {
    if (!token) continue;
    if (token.startsWith("--")) {
      const body = token.slice(2);
      if (body) {
        const parts = body.split(",");
        cmd = { name: parts[0], args: parts.slice(1).filter(Boolean) };
      }
    } else if (token.startsWith(".") && token.length > 1) {
      exts.push(token.slice(1).toLowerCase());
      filesIntent = true;
    } else if (token.startsWith("-")) {
      filesIntent = true;
      const code = token.slice(1).toLowerCase();
      if (code) cats.push(code);
    } else {
      terms.push(token);
    }
  }
  return { terms, exts, cats, cmd, filesIntent };
}
