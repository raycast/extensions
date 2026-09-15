import { buildJsonTree, JsonTree, looksLikeJsonInput, parseJsonDocument } from "./jsonTools";

export type InputSource = "Clipboard" | "Manual Input" | "Restored Draft";

export interface JsonDocument {
  source: string;
  inputSource: InputSource;
  value: unknown;
  tree: JsonTree;
  parseNestedStrings: boolean;
  nestedStringCount: number;
}

export function readDocument(
  source: string,
  inputSource: InputSource,
  parseNestedStrings = true,
): { ok: true; document: JsonDocument } | { ok: false; error: string } {
  const parsed = parseJsonDocument(source, { parseNestedStrings });
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    document: {
      source,
      inputSource,
      value: parsed.value,
      tree: buildJsonTree(parsed.value),
      parseNestedStrings,
      nestedStringCount: parsed.nestedStringCount,
    },
  };
}

export function initialInput(
  draft: string | undefined,
  clipboard: string | undefined,
):
  | { kind: "editor"; source: string; inputSource: InputSource; error?: string }
  | { kind: "browser"; document: JsonDocument } {
  if (draft?.trim()) return { kind: "editor", source: draft, inputSource: "Restored Draft" };
  if (!clipboard?.trim()) return { kind: "editor", source: "", inputSource: "Manual Input" };
  const parsed = readDocument(clipboard, "Clipboard");
  if (!parsed.ok && !looksLikeJsonInput(clipboard)) return { kind: "editor", source: "", inputSource: "Manual Input" };
  return parsed.ok
    ? { kind: "browser", document: parsed.document }
    : { kind: "editor", source: clipboard, inputSource: "Clipboard", error: parsed.error };
}
