import {
  applyEdits,
  format,
  parseTree,
  printParseErrorCode,
  type Node,
  type ParseError,
} from "jsonc-parser/lib/esm/main";

export const MAX_INPUT_BYTES = 1024 * 1024;
export const MAX_DEPTH = 128;
export const MAX_NODES = 50000;

export type JsonDocument = {
  source: string;
  root: Node;
  pretty: string;
  compact: string;
};

export function parseDocument(source: string): JsonDocument {
  if (Buffer.byteLength(source, "utf8") > MAX_INPUT_BYTES)
    throw new Error("Input exceeds the 1 MiB limit");
  const errors: ParseError[] = [];
  const root = parseTree(source, errors, {
    disallowComments: true,
    allowTrailingComma: false,
  });
  if (errors.length || !root) {
    const error = errors[0];
    throw new Error(
      error
        ? `${printParseErrorCode(error.error)} at offset ${error.offset}`
        : "Enter a JSON value",
    );
  }
  const stack: Array<{ node: Node; depth: number }> = [
    { node: root, depth: 0 },
  ];
  let count = 0;
  while (stack.length) {
    const { node, depth } = stack.pop()!;
    if (++count > MAX_NODES) throw new Error("JSON exceeds the node limit");
    if (depth > MAX_DEPTH) throw new Error("JSON exceeds the depth limit");
    for (const child of node.children ?? [])
      stack.push({
        node: child,
        depth: depth + (node.type === "property" ? 0 : 1),
      });
  }
  const pretty = applyEdits(
    source,
    format(source, undefined, { tabSize: 2, insertSpaces: true, eol: "\n" }),
  );
  // Whitespace removal must not touch string contents or number tokens.
  let compact = "";
  let inString = false;
  let escaped = false;
  for (const ch of source) {
    if (inString) {
      compact += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
      compact += ch;
    } else if (!/[ \t\r\n]/.test(ch)) compact += ch;
  }
  return { source, root, pretty, compact };
}

export function escapeJson(source: string): string {
  parseDocument(source);
  return JSON.stringify(source);
}

export function unescapeJson(source: string): string {
  const document = parseDocument(source);
  if (document.root.type !== "string")
    throw new Error("Enter a complete JSON string");
  return JSON.parse(source) as string;
}

export function stats(text: string): { lines: number; characters: number } {
  return {
    lines: text.split("\n").length,
    characters: Array.from(text).length,
  };
}
