/**
 * Minimal, fast XML plist parser for `ioreg -a` / `diskutil -plist` output.
 * The `plist` npm package (xmldom) takes many seconds on multi-MB ioreg dumps; this is a single regex pass.
 */

const TOKEN =
  /<(\/?)(dict|array|key|string|integer|real|true|false|data|date)(\s*\/)?>|<\?xml[^>]*\?>|<!DOCTYPE[^>]*>|<\/?plist[^>]*>/g;

const ENTITIES: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&apos;": "'" };
const unescape = (s: string) =>
  s.indexOf("&") === -1
    ? s
    : s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m) => {
        if (ENTITIES[m]) return ENTITIES[m];
        const code = m[2] === "x" || m[2] === "X" ? parseInt(m.slice(3, -1), 16) : parseInt(m.slice(2, -1), 10);
        return String.fromCodePoint(code);
      });

type Container = { kind: "dict"; value: Record<string, unknown>; key?: string } | { kind: "array"; value: unknown[] };

export function parsePlist(xml: string): unknown {
  const stack: Container[] = [];
  let root: unknown = undefined;
  let textStart = -1;
  let openTag = "";

  const push = (v: unknown) => {
    const top = stack[stack.length - 1];
    if (!top) {
      root = v;
    } else if (top.kind === "array") {
      top.value.push(v);
    } else if (top.key !== undefined) {
      top.value[top.key] = v;
      top.key = undefined;
    }
  };

  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(xml))) {
    const [whole, closing, tag, selfClose] = m;
    if (!tag) continue; // xml decl / doctype / plist wrapper

    if (selfClose) {
      if (tag === "true") push(true);
      else if (tag === "false") push(false);
      else if (tag === "dict") push({});
      else if (tag === "array") push([]);
      else if (tag === "string" || tag === "data") push(tag === "data" ? Buffer.alloc(0) : "");
      continue;
    }

    if (!closing) {
      if (tag === "dict") stack.push({ kind: "dict", value: {} });
      else if (tag === "array") stack.push({ kind: "array", value: [] });
      else {
        openTag = tag;
        textStart = m.index + whole.length;
      }
      continue;
    }

    // closing tag
    if (tag === "dict" || tag === "array") {
      const done = stack.pop();
      if (done) push(done.value);
      continue;
    }
    if (tag !== openTag || textStart < 0) continue;
    const raw = xml.slice(textStart, m.index);
    textStart = -1;
    switch (tag) {
      case "key": {
        const top = stack[stack.length - 1];
        if (top && top.kind === "dict") top.key = unescape(raw);
        break;
      }
      case "string":
        push(unescape(raw));
        break;
      case "integer": {
        const t = raw.trim();
        push(/^-?0x/i.test(t) ? parseInt(t, 16) : Number(t));
        break;
      }
      case "real":
        push(Number(raw.trim()));
        break;
      case "data":
        push(Buffer.from(raw.replace(/\s+/g, ""), "base64"));
        break;
      case "date":
        push(new Date(raw.trim()));
        break;
    }
  }
  return root;
}
