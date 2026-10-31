/**
 * Minimal ICU-style template formatter: `{name}` placeholders and plurals
 * like `{count, plural, one {# item} other {# items}}`.
 */
export type Params = Record<string, string | number>;

export function format(template: string, params: Params, lang: string): string {
  return render(parse(template), params, lang);
}

// ---- parser ------------------------------------------------------------------

type Node = string | { arg: string } | { arg: string; plural: Record<string, Node[]> };

/** Parses a template: text, `{arg}` and `{arg, plural, cat {...} ...}`. */
export function parse(template: string): Node[] {
  const out: Node[] = [];
  let i = 0;
  let text = "";
  while (i < template.length) {
    const ch = template[i]!;
    if (ch === "'" && template[i + 1] === "{") {
      // `'{` = literal brace
      text += "{";
      i += 2;
      continue;
    }
    if (ch !== "{") {
      text += ch;
      i++;
      continue;
    }
    const end = matchBrace(template, i);
    const inner = template.slice(i + 1, end);
    if (text) out.push(text);
    text = "";
    i = end + 1;
    const comma = inner.indexOf(",");
    if (comma === -1) {
      out.push({ arg: inner.trim() });
      continue;
    }
    const arg = inner.slice(0, comma).trim();
    const rest = inner.slice(comma + 1).trim();
    if (!rest.startsWith("plural")) throw new Error(`Unsupported argument type in "${template}"`);
    const plural: Record<string, Node[]> = {};
    let j = rest.indexOf(",") + 1;
    while (j < rest.length) {
      const m = /^\s*(=\d+|\w+)\s*\{/.exec(rest.slice(j));
      if (!m) break;
      const open = j + m[0].length - 1;
      const close = matchBrace(rest, open);
      plural[m[1]!] = parse(rest.slice(open + 1, close));
      j = close + 1;
    }
    out.push({ arg, plural });
  }
  if (text) out.push(text);
  return out;
}

function matchBrace(s: string, open: number): number {
  let depth = 0;
  for (let k = open; k < s.length; k++) {
    if (s[k] === "{") depth++;
    else if (s[k] === "}") {
      depth--;
      if (depth === 0) return k;
    }
  }
  throw new Error(`Unbalanced braces in "${s}"`);
}

function render(nodes: Node[], params: Params, lang: string, hash?: string): string {
  let out = "";
  for (const node of nodes) {
    if (typeof node === "string") {
      out += hash === undefined ? node : node.replace(/#/g, hash);
      continue;
    }
    const value = params[node.arg];
    if ("plural" in node) {
      const n = typeof value === "number" ? value : Number(value ?? 0);
      const formatted = new Intl.NumberFormat(lang).format(n);
      const exact = node.plural[`=${n}`];
      const category = pluralCategory(lang, n);
      const branch = exact ?? node.plural[category] ?? node.plural.other ?? [];
      out += render(branch, params, lang, formatted);
      continue;
    }
    out +=
      value === undefined
        ? `{${node.arg}}`
        : typeof value === "number"
          ? new Intl.NumberFormat(lang).format(value)
          : value;
  }
  return out;
}

function pluralCategory(lang: string, n: number): string {
  try {
    return new Intl.PluralRules(lang).select(n);
  } catch {
    return n === 1 ? "one" : "other";
  }
}
