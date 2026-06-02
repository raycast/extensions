import { createHash } from "node:crypto";
import { ProsodyAnalysisSchema, type ProsodyAnalysis } from "../types";

export const MAX_SAVED_RESULTS = 100;

export type SavedResultKind = "expression" | "translation" | "analysis";

export interface SavedResult {
  id: string;
  kind: SavedResultKind;
  title: string;
  sourceText: string;
  outputText?: string;
  coaching?: string;
  markdown: string;
  provider: string;
  providerTitle?: string;
  model: string;
  targetLanguageTitle?: string;
  tone?: string;
  analysis?: ProsodyAnalysis;
  ttsProvider?: string;
  ttsProviderTitle?: string;
  ttsModel?: string;
  ttsVoice?: string;
  createdAt: string;
  updatedAt: string;
}

export type SaveResultInput = Omit<
  SavedResult,
  "id" | "title" | "createdAt" | "updatedAt"
> & {
  title?: string;
};

export function buildSavedResult(
  input: SaveResultInput,
  existing: SavedResult[],
  now: string,
): SavedResult {
  const id = savedResultId(input);
  const previous = existing.find((item) => item.id === id);
  return {
    ...input,
    id,
    title: input.title ?? defaultTitle(input),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}

export function insertSavedResult(
  result: SavedResult,
  existing: SavedResult[],
): SavedResult[] {
  return [result, ...existing.filter((item) => item.id !== result.id)].slice(
    0,
    MAX_SAVED_RESULTS,
  );
}

export function normalizeSavedResults(value: unknown): SavedResult[] {
  if (!Array.isArray(value)) return [];
  const results: SavedResult[] = [];
  for (const item of value) {
    const normalized = normalizeSavedResult(item);
    if (normalized) results.push(normalized);
  }
  return results
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_SAVED_RESULTS);
}

export function savedResultId(input: SaveResultInput): string {
  return createHash("sha1")
    .update(
      JSON.stringify({
        kind: input.kind,
        sourceText: input.sourceText.trim(),
        outputText: input.outputText?.trim(),
        markdown: input.markdown.trim(),
        provider: input.provider,
        model: input.model,
        targetLanguageTitle: input.targetLanguageTitle,
        tone: input.tone,
      }),
    )
    .digest("hex")
    .slice(0, 20);
}

export function savedResultPrimaryText(item: SavedResult): string {
  if (item.kind === "analysis") return item.sourceText;
  return item.outputText ?? item.sourceText;
}

export function savedResultKindLabel(kind: SavedResultKind): string {
  if (kind === "expression") return "Expression";
  if (kind === "analysis") return "Analysis";
  return "Translation";
}

function normalizeSavedResult(value: unknown): SavedResult | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<SavedResult>;
  if (
    item.kind !== "expression" &&
    item.kind !== "translation" &&
    item.kind !== "analysis"
  ) {
    return null;
  }
  if (
    typeof item.id !== "string" ||
    typeof item.sourceText !== "string" ||
    typeof item.markdown !== "string" ||
    typeof item.provider !== "string" ||
    typeof item.model !== "string" ||
    typeof item.createdAt !== "string" ||
    typeof item.updatedAt !== "string"
  ) {
    return null;
  }
  const analysis = item.analysis
    ? ProsodyAnalysisSchema.safeParse(item.analysis)
    : null;
  return {
    id: item.id,
    kind: item.kind,
    title:
      typeof item.title === "string"
        ? item.title
        : defaultTitle(item as SaveResultInput),
    sourceText: item.sourceText,
    outputText:
      typeof item.outputText === "string" ? item.outputText : undefined,
    coaching: typeof item.coaching === "string" ? item.coaching : undefined,
    markdown: item.markdown,
    provider: item.provider,
    providerTitle:
      typeof item.providerTitle === "string" ? item.providerTitle : undefined,
    model: item.model,
    targetLanguageTitle:
      typeof item.targetLanguageTitle === "string"
        ? item.targetLanguageTitle
        : undefined,
    tone: typeof item.tone === "string" ? item.tone : undefined,
    analysis: analysis?.success ? analysis.data : undefined,
    ttsProvider:
      typeof item.ttsProvider === "string" ? item.ttsProvider : undefined,
    ttsProviderTitle:
      typeof item.ttsProviderTitle === "string"
        ? item.ttsProviderTitle
        : undefined,
    ttsModel: typeof item.ttsModel === "string" ? item.ttsModel : undefined,
    ttsVoice: typeof item.ttsVoice === "string" ? item.ttsVoice : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function defaultTitle(input: Pick<SavedResult, "kind" | "sourceText">): string {
  const prefix = savedResultKindLabel(input.kind);
  const compact = input.sourceText.replace(/\s+/g, " ").trim();
  if (!compact) return prefix;
  return `${prefix}: ${compact.slice(0, 48)}${compact.length > 48 ? "..." : ""}`;
}
