export type WindowReply = { action: "paste"; text: string; html?: string };

export function parseWindowReply(output: string): WindowReply | undefined {
  if (!output.trim()) return undefined;
  const value = JSON.parse(output) as Record<string, unknown>;
  if (
    !value ||
    typeof value !== "object" ||
    value.action !== "paste" ||
    typeof value.text !== "string" ||
    (value.html !== undefined && typeof value.html !== "string")
  ) {
    throw new Error("Invalid response from the translator window.");
  }
  return value as WindowReply;
}

export type Language = { id: string; name: string };
export type SourceText = { text: string; rtf?: string };
export type Translation = SourceText & {
  sourceLanguage: string;
  targetLanguage: string;
  html?: string;
};
export type Request =
  | { operation: "languages" | "clipboard" }
  | {
      operation: "preview";
      text: string;
      translation: string;
      sourceLabel: string;
      targetLabel: string;
      dark: boolean;
    }
  | ({
      operation: "translate";
      source: string;
      target: string;
      paired: boolean;
    } & SourceText);
export type Reply =
  | { ok: true; languages: Language[] }
  | { ok: true; document: string }
  | ({ ok: true } & SourceText)
  | ({ ok: true } & Translation);

export function parseReply(output: string): Reply {
  const value = JSON.parse(output) as Record<string, unknown>;
  if (!value || typeof value !== "object")
    throw new Error("Invalid response from Apple Translate.");
  if (value.ok === false && typeof value.message === "string")
    throw new Error(value.message);
  if (value.ok === true) {
    if (
      typeof value.document === "string" &&
      value.document.startsWith("data:image/svg+xml;base64,")
    )
      return value as Reply;
    if (
      Array.isArray(value.languages) &&
      value.languages.length &&
      value.languages.every(
        (item) =>
          item && typeof item.id === "string" && typeof item.name === "string",
      )
    )
      return value as Reply;
    if (
      typeof value.text === "string" &&
      (value.rtf === undefined || typeof value.rtf === "string") &&
      (value.html === undefined || typeof value.html === "string") &&
      (value.sourceLanguage === undefined ||
        typeof value.sourceLanguage === "string") &&
      (value.targetLanguage === undefined ||
        typeof value.targetLanguage === "string")
    )
      return value as Reply;
  }
  throw new Error("Invalid response from Apple Translate.");
}
export function inputError(text: string): string | undefined {
  return text.length > 20_000
    ? "Use at most 20,000 characters per translation."
    : undefined;
}
