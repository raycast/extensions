// The manual is a Next.js App Router site. Its server-rendered content and
// navigation tree are embedded in the page as a sequence of `self.__next_f.push`
// calls — each chunk is a JSON string literal, and concatenating them yields
// the full RSC stream. Some content (notably Radix Accordion bodies) is not
// rendered into the static HTML and is only present in this stream.

export function decodeRscChunks(html: string): string {
  const re = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g;
  const parts: string[] = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    parts.push(JSON.parse(`"${m[1]}"`));
  }
  return parts.join("");
}

type Value =
  | { kind: "string"; value: string }
  | { kind: "array"; items: Value[] }
  | { kind: "object"; props: Map<string, Value> }
  | { kind: "call"; callee: string; args: Value[] }
  | { kind: "ident"; name: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "null" };

// Recursive-descent parser for the JSX-ish factory calls in the RSC stream.
// Handles strings, arrays, objects, identifiers, member access, and function
// calls — enough to reconstruct the structure of an accordion body.
class Parser {
  i = 0;
  constructor(private readonly s: string) {}

  skipWs() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++;
  }

  parseValue(): Value {
    this.skipWs();
    const ch = this.s[this.i];
    if (ch === '"' || ch === "'") return this.parseString();
    if (ch === "[") return this.parseArray();
    if (ch === "{") return this.parseObject();
    if (ch === "-" || (ch >= "0" && ch <= "9")) return this.parseNumber();
    return this.parseIdentOrCall();
  }

  parseString(): Value {
    // Handles both `"..."` and `'...'` JS string literals (the manual's RSC
    // payload uses single quotes when the content contains unescaped double
    // quotes, e.g. `'If you\'re hitting "Token expired"'`).
    const quote = this.s[this.i];
    this.i++;
    let result = "";
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (c === "\\") {
        const next = this.s[this.i + 1];
        this.i += 2;
        switch (next) {
          case "n":
            result += "\n";
            break;
          case "t":
            result += "\t";
            break;
          case "r":
            result += "\r";
            break;
          case "b":
            result += "\b";
            break;
          case "f":
            result += "\f";
            break;
          case "0":
            result += "\0";
            break;
          case "u": {
            const hex = this.s.slice(this.i, this.i + 4);
            this.i += 4;
            result += String.fromCharCode(parseInt(hex, 16));
            break;
          }
          case "x": {
            const hex = this.s.slice(this.i, this.i + 2);
            this.i += 2;
            result += String.fromCharCode(parseInt(hex, 16));
            break;
          }
          default:
            result += next;
        }
      } else if (c === quote) {
        this.i++;
        return { kind: "string", value: result };
      } else {
        result += c;
        this.i++;
      }
    }
    throw new Error("Unterminated string");
  }

  parseArray(): Value {
    this.i++;
    const items: Value[] = [];
    this.skipWs();
    if (this.s[this.i] === "]") {
      this.i++;
      return { kind: "array", items };
    }
    while (true) {
      items.push(this.parseValue());
      this.skipWs();
      if (this.s[this.i] === ",") {
        this.i++;
        continue;
      }
      if (this.s[this.i] === "]") {
        this.i++;
        return { kind: "array", items };
      }
      throw new Error(`Expected , or ] at ${this.i}`);
    }
  }

  parseObject(): Value {
    this.i++;
    const props = new Map<string, Value>();
    this.skipWs();
    if (this.s[this.i] === "}") {
      this.i++;
      return { kind: "object", props };
    }
    while (true) {
      this.skipWs();
      let key: string;
      if (this.s[this.i] === '"' || this.s[this.i] === "'") {
        key = (this.parseString() as { kind: "string"; value: string }).value;
      } else {
        const start = this.i;
        while (this.i < this.s.length && /[\w$]/.test(this.s[this.i])) this.i++;
        key = this.s.slice(start, this.i);
      }
      this.skipWs();
      if (this.s[this.i] !== ":") throw new Error(`Expected : at ${this.i}`);
      this.i++;
      props.set(key, this.parseValue());
      this.skipWs();
      if (this.s[this.i] === ",") {
        this.i++;
        continue;
      }
      if (this.s[this.i] === "}") {
        this.i++;
        return { kind: "object", props };
      }
      throw new Error(`Expected , or } at ${this.i}`);
    }
  }

  parseNumber(): Value {
    const start = this.i;
    if (this.s[this.i] === "-") this.i++;
    while (this.i < this.s.length && /[\d.eE+-]/.test(this.s[this.i])) this.i++;
    return { kind: "number", value: parseFloat(this.s.slice(start, this.i)) };
  }

  parseIdentOrCall(): Value {
    const start = this.i;
    while (this.i < this.s.length && /[\w$.]/.test(this.s[this.i])) this.i++;
    const name = this.s.slice(start, this.i);
    if (!name) throw new Error(`Unexpected char at ${this.i}`);
    if (name === "true") return { kind: "boolean", value: true };
    if (name === "false") return { kind: "boolean", value: false };
    if (name === "null") return { kind: "null" };
    this.skipWs();
    if (this.s[this.i] === "(") {
      this.i++;
      const args: Value[] = [];
      this.skipWs();
      if (this.s[this.i] === ")") {
        this.i++;
        return { kind: "call", callee: name, args };
      }
      while (true) {
        args.push(this.parseValue());
        this.skipWs();
        if (this.s[this.i] === ",") {
          this.i++;
          continue;
        }
        if (this.s[this.i] === ")") {
          this.i++;
          return { kind: "call", callee: name, args };
        }
        throw new Error(`Expected , or ) at ${this.i}`);
      }
    }
    return { kind: "ident", name };
  }
}

function findAccordionItems(rsc: string): Map<string, Value> {
  // Each accordion item shows up in the RSC as `<factory>(<wrapperAlias>,{id:"...",children:VALUE})`.
  // Both the JSX factory (n/d/t/i/...) and the wrapper alias (r/s/a/o/t/...) vary per page —
  // they're whatever the bundler happened to pick — so we match any identifier on either side
  // and identify the item by its id, which we cross-reference with the static HTML at the
  // call site. Heading anchors and other id-bearing nodes have a different shape (no
  // `children:` immediately after `id:`).
  const result = new Map<string, Value>();
  const re = /\w+\(\w+,\{id:"([^"]+)",children:/g;
  let m;
  while ((m = re.exec(rsc)) !== null) {
    const id = m[1];
    const parser = new Parser(rsc);
    parser.i = re.lastIndex;
    try {
      result.set(id, parser.parseValue());
    } catch {
      // Skip items we can't parse — the rest still render.
    }
  }
  return result;
}

const VOID_TAGS = new Set(["br", "hr", "img"]);

function renderValue(v: Value): string {
  switch (v.kind) {
    case "string":
      // RSC reference placeholders ("$L1c" etc.) point at other chunks and
      // would render as literal text; drop them.
      if (v.value.startsWith("$")) return "";
      return escapeHtml(v.value);
    case "number":
      return escapeHtml(String(v.value));
    case "array":
      return v.items.map(renderValue).join("");
    case "call":
      return renderElement(v.args);
    default:
      return "";
  }
}

function renderElement(args: Value[]): string {
  const [componentArg, propsArg] = args;
  if (!componentArg || !propsArg || propsArg.kind !== "object") return "";
  const componentName = componentArg.kind === "ident" ? componentArg.name : "";
  const props = propsArg.props;

  // Platform-specific content wrapper (PlatformRoot / PlatformContent on the
  // manual). The component alias varies per page, so detect it by the
  // `platforms` / `platform` prop instead. Keep only macOS, matching the
  // existing `[data-platform-image="mac"]` rule for hero images.
  if (props.has("platforms")) {
    const children = props.get("children");
    if (!children) return "";
    const mac = pickPlatformContent(children, "mac");
    return renderValue(mac ?? children);
  }
  if (props.has("platform")) {
    return renderChildren(props);
  }

  // Bare single-letter component refs (no dot) are local aliases for
  // AccordionTrigger and similar interactive wrappers. Their content is just
  // the question/title text, which is already in the static HTML — skip.
  if (!componentName.includes(".")) return "";

  // Markdown primitives are bound as `<module>.<tag>` (e.g. `i.p`, `t.code`).
  // The module alias varies per page; the tag name is what we want.
  const tag = componentName.slice(componentName.indexOf(".") + 1);
  if (!tag) return renderChildren(props);
  // Headings inside an answer body would collide with the H3 we emit for the
  // question — demote them by one level.
  if (/^h[1-5]$/.test(tag)) {
    const level = Math.min(6, parseInt(tag.slice(1), 10) + 1);
    return renderHtmlTag(`h${level}`, props);
  }
  return renderHtmlTag(tag, props);
}

function pickPlatformContent(children: Value, platform: string): Value | null {
  const items = children.kind === "array" ? children.items : [children];
  for (const item of items) {
    if (item.kind !== "call") continue;
    const [, p] = item.args;
    if (p?.kind !== "object") continue;
    const plat = p.props.get("platform");
    if (plat?.kind === "string" && plat.value === platform) {
      const ch = p.props.get("children");
      if (ch) return ch;
    }
  }
  return null;
}

function renderChildren(props: Map<string, Value>): string {
  const ch = props.get("children");
  return ch ? renderValue(ch) : "";
}

function renderHtmlTag(tag: string, props: Map<string, Value>): string {
  const attrs: string[] = [];
  for (const [key, val] of props) {
    if (key === "children") continue;
    if (val.kind === "string" && !val.value.startsWith("$")) {
      attrs.push(`${key}="${escapeAttr(val.value)}"`);
    }
  }
  const attrStr = attrs.length ? " " + attrs.join(" ") : "";
  if (VOID_TAGS.has(tag)) return `<${tag}${attrStr}>`;
  return `<${tag}${attrStr}>${renderChildren(props)}</${tag}>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// Walks the page's RSC payload and returns one HTML fragment per accordion
// item, keyed by the item's `id` attribute. Returns an empty map if anything
// goes wrong — the caller should fall back to whatever the static HTML offers.
export function extractAccordionAnswers(html: string): Map<string, string> {
  let rsc: string;
  try {
    rsc = decodeRscChunks(html);
  } catch {
    return new Map();
  }
  const items = findAccordionItems(rsc);
  const out = new Map<string, string>();
  for (const [id, value] of items) {
    try {
      const rendered = renderValue(value).trim();
      if (rendered) out.set(id, rendered);
    } catch {
      /* skip */
    }
  }
  return out;
}
