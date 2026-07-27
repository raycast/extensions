/**
 * Parse `@central-icons-react/*` component sources into raw SVG strings.
 *
 * The published packages ship no `.svg` files — only minified React components
 * built from nested `React.createElement(...)` calls. This module walks that
 * call tree and re-emits it as SVG markup.
 *
 * A flat regex over `createElement("tag",{props})` is NOT sufficient: 9 icons
 * across the two default styles wrap their paths in
 * `<g clipPath="url(#clip0_…)">` and close with a matching
 * `<defs><clipPath id="clip0_…">…</clipPath></defs>`. Flattening those drops
 * both the nesting and the definition, so the clip silently stops applying.
 * Hence a real recursive descent over the argument list.
 *
 * Pure string/AST work — no filesystem, no network — so it stays unit-testable.
 */

/** React prop name → SVG attribute name. Anything camelCased must be listed. */
const ATTR = {
  strokeWidth: "stroke-width",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeDasharray: "stroke-dasharray",
  strokeOpacity: "stroke-opacity",
  strokeMiterlimit: "stroke-miterlimit",
  fillRule: "fill-rule",
  clipRule: "clip-rule",
  clipPath: "clip-path",
};

/** Elements that are legal inside the emitted SVG. */
const ALLOWED_TAGS = new Set(["path", "circle", "ellipse", "rect", "g", "line", "polygon", "polyline", "defs", "clipPath", "mask", "use"]);

const SELF_CLOSING = new Set(["path", "circle", "ellipse", "rect", "line", "polygon", "polyline", "use"]);

/** Escape a value for inclusion in a double-quoted XML attribute. */
function escapeAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Read a double-quoted JS string literal starting at `i` (which must index the
 * opening quote). Returns `[value, nextIndex]`.
 */
function readString(src, i) {
  if (src[i] !== '"') throw new Error(`Expected '"' at ${i}, got ${JSON.stringify(src[i])}`);
  let out = "";
  i += 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") {
      const next = src[i + 1];
      // Only the escapes esbuild actually emits in these bundles.
      const simple = { n: "\n", t: "\t", r: "\r", "\\": "\\", '"': '"', "'": "'" };
      if (next in simple) {
        out += simple[next];
        i += 2;
        continue;
      }
      if (next === "u") {
        out += String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16));
        i += 6;
        continue;
      }
      out += next;
      i += 2;
      continue;
    }
    if (ch === '"') return [out, i + 1];
    out += ch;
    i += 1;
  }
  throw new Error("Unterminated string literal");
}

/**
 * Scan forward from `i` to the index just past the balanced closing delimiter,
 * respecting nesting and skipping over string/template literals so that a
 * bracket inside a string never counts.
 */
function matchDelimiter(src, i, open, close) {
  let depth = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      [, i] = readStringLike(src, i, ch);
      continue;
    }
    if (ch === "`") {
      i = skipTemplate(src, i);
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
    i += 1;
  }
  throw new Error(`Unbalanced ${open}${close}`);
}

function readStringLike(src, i, quote) {
  let out = "";
  i += 1;
  while (i < src.length) {
    if (src[i] === "\\") {
      out += src[i + 1];
      i += 2;
      continue;
    }
    if (src[i] === quote) return [out, i + 1];
    out += src[i];
    i += 1;
  }
  throw new Error("Unterminated string");
}

function skipTemplate(src, i) {
  i += 1;
  while (i < src.length) {
    if (src[i] === "\\") {
      i += 2;
      continue;
    }
    if (src[i] === "`") return i + 1;
    i += 1;
  }
  throw new Error("Unterminated template literal");
}

/**
 * Parse an object literal of the form `{a:"1",b:"2"}` into a Map, preserving
 * source order. Only string-valued props are kept — the survey across both
 * default style packages found zero non-string prop values on SVG elements,
 * and a non-string value (a spread, an identifier) is something this extractor
 * must not silently guess at, so it throws.
 */
function parseProps(src, start) {
  const end = matchDelimiter(src, start, "{", "}");
  const body = src.slice(start + 1, end - 1);
  const props = new Map();

  let i = 0;
  while (i < body.length) {
    while (i < body.length && /[\s,]/.test(body[i])) i += 1;
    if (i >= body.length) break;

    // Key: bare identifier or quoted (e.g. "aria-hidden").
    let key;
    if (body[i] === '"') {
      [key, i] = readString(body, i);
    } else {
      const m = /^[A-Za-z_$][\w$]*/.exec(body.slice(i));
      if (!m) throw new Error(`Unparseable prop key at ${i}: ${body.slice(i, i + 40)}`);
      key = m[0];
      i += key.length;
    }

    while (i < body.length && /\s/.test(body[i])) i += 1;
    if (body[i] !== ":") throw new Error(`Expected ':' after prop ${key}`);
    i += 1;
    while (i < body.length && /\s/.test(body[i])) i += 1;

    if (body[i] !== '"') {
      throw new Error(`Non-string value for prop ${JSON.stringify(key)} — refusing to guess`);
    }
    let value;
    [value, i] = readString(body, i);
    props.set(key, value);
  }
  return [props, end];
}

/**
 * Split an argument list body on top-level commas, ignoring commas nested
 * inside brackets or strings.
 */
function splitArgs(body) {
  const parts = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === '"' || ch === "'") {
      [, i] = readStringLike(body, i, ch);
      continue;
    }
    if (ch === "`") {
      i = skipTemplate(body, i);
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
    else if (ch === "," && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
    i += 1;
  }
  const tail = body.slice(start);
  if (tail.trim()) parts.push(tail);
  return parts;
}

/**
 * Render one `X.createElement("tag", {...}, ...children)` call — and everything
 * nested inside it — as SVG markup. `start` must index the `(` of the call.
 */
function renderCall(src, start) {
  const end = matchDelimiter(src, start, "(", ")");
  const args = splitArgs(src.slice(start + 1, end - 1));
  if (args.length === 0) return ["", end];

  const tagMatch = /^\s*"([\w-]+)"/.exec(args[0]);
  if (!tagMatch) {
    // A component reference (e.g. the shared base or a Fragment) rather than a
    // host element: render its children in place.
    let out = "";
    for (const child of args.slice(2)) out += renderChildren(child);
    return [out, end];
  }

  const tag = tagMatch[1];
  if (!ALLOWED_TAGS.has(tag)) {
    throw new Error(`Unexpected SVG element ${JSON.stringify(tag)}`);
  }

  const propsSrc = args[1] ?? "null";
  let attrs = "";
  const braceAt = propsSrc.indexOf("{");
  if (braceAt !== -1) {
    const [props] = parseProps(propsSrc, braceAt);
    for (const [key, value] of props) {
      const name = ATTR[key] ?? key;
      attrs += ` ${name}="${escapeAttr(value)}"`;
    }
  }

  let inner = "";
  for (const child of args.slice(2)) inner += renderChildren(child);

  if (!inner && SELF_CLOSING.has(tag)) return [`<${tag}${attrs}/>`, end];
  return [`<${tag}${attrs}>${inner}</${tag}>`, end];
}

/** Render every `createElement` call appearing in an argument expression. */
function renderChildren(expr) {
  let out = "";
  let i = 0;
  while (i < expr.length) {
    const at = expr.indexOf("createElement", i);
    if (at === -1) break;
    const paren = expr.indexOf("(", at);
    if (paren === -1) break;
    const [markup, end] = renderCall(expr, paren);
    out += markup;
    i = end;
  }
  return out;
}

/**
 * Extract `{ name, aliases, svg }` from one component module.
 *
 * The module contains a shared base component (mask plumbing, sizing) followed
 * by the icon itself. The icon's own artwork is everything after its
 * `maskId:"…"` marker, which is what we walk — the base component's mask/rect
 * scaffolding is presentation for React consumers and is deliberately excluded.
 * `mode="masked"` exists so semi-transparent colors render evenly; a plain SVG
 * export doesn't need it.
 */
export function parseIconModule(source, { name } = {}) {
  const marker = source.indexOf('maskId:"');
  if (marker === -1) throw new Error(`No maskId marker in ${name ?? "module"}`);

  const aliasMatch = /ariaLabel:"((?:[^"\\]|\\.)*)"/.exec(source);
  const aliases = aliasMatch ? aliasMatch[1].split(",").map((s) => s.trim()).filter(Boolean) : [];

  // The artwork children begin after the maskId prop's closing brace.
  const objEnd = source.indexOf("}", marker);
  const body = source.slice(objEnd + 1);
  const inner = renderChildren(body);

  if (!inner) throw new Error(`No SVG elements recovered for ${name ?? "module"}`);
  if (!/<(path|circle|ellipse|rect|polygon|polyline|line)\b/.test(inner)) {
    throw new Error(`Recovered markup has no drawable geometry for ${name ?? "module"}`);
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">` +
    inner +
    `</svg>`;

  return { name, aliases, svg };
}

export const __testing = { parseProps, splitArgs, renderChildren, escapeAttr, readString };
