// The two "JS object" halves of the converter, kept together because they are
// the only non-trivial custom logic in the format layer (everything else is a
// thin wrapper around a parser library).
//
//   evalJs(text)  — turn a pasted JavaScript snippet into a value
//   stringifyJs(value, options) — render a value back as JS/TS source
//
// Neither touches Raycast, so both stay testable and reusable from src/lib.

import { runInNewContext } from "node:vm";

// A pasted snippet runs in a fresh V8 context with only the standard built-ins
// (Object, Array, JSON, Math, Date, …) plus a CommonJS-style `module`/`exports`
// shim. There is no `require`, `process`, `fetch`, or filesystem access in that
// context, and a 1s timeout stops a runaway loop from hanging the command.
const EVAL_TIMEOUT_MS = 1000;

function makeSandbox(): Record<string, unknown> {
  const module = { exports: {} as unknown };
  // `console` is provided so snippets that log don't crash with ReferenceError.
  return { module, exports: module.exports, console };
}

/**
 * Evaluate a JavaScript snippet and return its value. Handles the shapes people
 * actually paste:
 *
 *   - a bare object/array literal or expression — `{ a: 1 }`, `[1, 2]`, `2 + 3`
 *   - an ES default export — `export default { … }`
 *   - a CommonJS export — `module.exports = { … }` / `exports.foo = …`
 *   - a single declaration — `const data = { … }`
 *
 * The code is executed (see the sandbox note above), so this is "evaluate", not
 * "parse": expressions, function calls, and computed values all resolve.
 */
export function evalJs(input: string): unknown {
  // Drop an ES `export default` / `export =` prefix; the remainder is just an
  // expression we can wrap and evaluate.
  const code = input
    .trim()
    .replace(/^export\s+default\s+/, "")
    .replace(/^export\s*=\s*/, "");
  if (!code) throw new Error("Nothing to evaluate.");

  const sandbox = makeSandbox();

  // CommonJS exports: run the snippet as statements, then read what it assigned.
  if (/\b(?:module\.exports|exports\.[\w$]+|exports\s*=)/.test(code)) {
    runInNewContext(code, sandbox, { timeout: EVAL_TIMEOUT_MS });
    return (sandbox.module as { exports: unknown }).exports;
  }

  // A single `const/let/var name = …` declaration. Append a capture statement to
  // the *same* script so the (block-scoped) binding is still in scope, then read
  // it back off the context global — works regardless of const/let/var.
  const decl = code.match(/^(?:const|let|var)\s+([\w$]+)\b/);
  if (decl) {
    runInNewContext(`${code}\n;globalThis.__toole_result = ${decl[1]};`, sandbox, { timeout: EVAL_TIMEOUT_MS });
    return (sandbox as { __toole_result?: unknown }).__toole_result;
  }

  // Otherwise treat the whole thing as an expression. Parenthesising forces the
  // `{ … }` to parse as an object literal rather than a block statement.
  return runInNewContext(`(${code.replace(/;\s*$/, "")})`, sandbox, { timeout: EVAL_TIMEOUT_MS });
}

export type QuoteStyle = "double" | "single";
export type KeyQuoting = "as-needed" | "always";
export type Declaration = "none" | "const" | "let" | "export-default" | "module-exports";

export interface JsStringifyOptions {
  /** Delimiter for string literals and quoted keys. */
  quotes?: QuoteStyle;
  /** Quote every key, or only those that aren't valid bare identifiers. */
  quoteKeys?: KeyQuoting;
  /** One indent level, e.g. "  ", "\t", or "" for a single minified line. */
  indent?: string;
  /** Statement wrapper around the value. */
  declaration?: Declaration;
  /** Variable name for the `const`/`let` wrappers. */
  variableName?: string;
  /** Append a trailing `;` (applies to every wrapper, including a bare value). */
  semi?: boolean;
  /** Add a trailing comma after the last item of multi-line arrays/objects. */
  trailingComma?: boolean;
  /** Append `as const` (TypeScript). */
  asConst?: boolean;
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function quoteString(value: string, quote: '"' | "'"): string {
  let out = "";
  for (const ch of value) {
    if (ch === quote) out += "\\" + quote;
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (ch === "\b") out += "\\b";
    else if (ch === "\f") out += "\\f";
    else if (ch < " ") out += "\\x" + ch.charCodeAt(0).toString(16).padStart(2, "0");
    else out += ch;
  }
  return quote + out + quote;
}

/** Render a value as JavaScript source. See {@link JsStringifyOptions}. */
export function stringifyJs(value: unknown, options: JsStringifyOptions = {}): string {
  const indent = options.indent ?? "  ";
  const minified = indent === "";
  const quote: '"' | "'" = options.quotes === "single" ? "'" : '"';
  const quoteKeys = options.quoteKeys ?? "as-needed";
  const trailingComma = !minified && (options.trailingComma ?? false);
  const newline = minified ? "" : "\n";
  const colon = minified ? ":" : ": ";

  const seen = new Set<object>();

  const renderKey = (key: string): string =>
    quoteKeys === "as-needed" && IDENTIFIER.test(key) ? key : quoteString(key, quote);

  const render = (val: unknown, depth: number): string => {
    if (val === null) return "null";
    if (val === undefined) return "undefined";

    switch (typeof val) {
      case "string":
        return quoteString(val, quote);
      case "bigint":
        return `${val}n`;
      case "boolean":
        return val ? "true" : "false";
      case "number":
        if (Number.isNaN(val)) return "NaN";
        if (val === Infinity) return "Infinity";
        if (val === -Infinity) return "-Infinity";
        return String(val);
      case "function":
      case "symbol":
        // Not representable as data — emit `undefined` rather than throwing.
        return "undefined";
    }

    if (val instanceof Date) return `new Date(${quoteString(val.toISOString(), quote)})`;

    if (seen.has(val as object)) throw new Error("Cannot serialize a circular structure.");
    seen.add(val as object);
    try {
      const pad = minified ? "" : indent.repeat(depth + 1);
      const closePad = minified ? "" : indent.repeat(depth);

      if (Array.isArray(val)) {
        if (val.length === 0) return "[]";
        const items = val.map((item) => pad + render(item, depth + 1));
        return `[${newline}${items.join("," + newline)}${trailingComma ? "," : ""}${newline}${closePad}]`;
      }

      const entries = Object.entries(val as Record<string, unknown>);
      if (entries.length === 0) return "{}";
      const items = entries.map(([key, item]) => `${pad}${renderKey(key)}${colon}${render(item, depth + 1)}`);
      return `{${newline}${items.join("," + newline)}${trailingComma ? "," : ""}${newline}${closePad}}`;
    } finally {
      seen.delete(val as object);
    }
  };

  let body = render(value, 0);
  if (options.asConst) body += " as const";

  const name = options.variableName || "data";
  const prefix: Record<Declaration, string> = {
    none: "",
    const: `const ${name} = `,
    let: `let ${name} = `,
    "export-default": "export default ",
    "module-exports": "module.exports = ",
  };

  return prefix[options.declaration ?? "none"] + body + (options.semi ? ";" : "");
}
