import { buildRewriteCoachPrompt } from "./prompt";
import { generateWithProvider } from "./providers";
import { ProviderConfig, RewriteTone } from "./types";

export interface RewriteResult {
  rewritten: string;
  why: string;
}

const REWRITE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    rewritten: {
      type: "string",
      description: "Only the rewritten English text, with no labels, quotes, or Markdown.",
    },
    why: {
      type: "string",
      description: 'A concise Simplified Chinese Markdown bullet list. Each point starts with "- ".',
    },
  },
  required: ["rewritten", "why"],
  additionalProperties: false,
  propertyOrdering: ["rewritten", "why"],
};

export async function runRewrite(
  config: ProviderConfig,
  text: string,
  tone: RewriteTone,
  timeoutMs: number,
  maxOutputTokens: number,
): Promise<RewriteResult> {
  const raw = await generateWithProvider(config, buildRewriteCoachPrompt(text, tone), timeoutMs, maxOutputTokens, {
    responseMimeType: "application/json",
    responseJsonSchema: REWRITE_RESPONSE_SCHEMA,
  });
  return parseRewriteResult(raw);
}

export function parseRewriteResult(raw: string): RewriteResult {
  const candidates = [raw.trim(), stripCodeFence(raw), extractJsonObject(raw)];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as { rewritten?: unknown; why?: unknown };
      const rewritten = typeof parsed.rewritten === "string" ? parsed.rewritten.trim() : "";
      const why = typeof parsed.why === "string" ? parsed.why.trim() : "";
      if (rewritten) {
        return { rewritten, why };
      }
    } catch {
      // Try the next candidate representation.
    }
  }

  throw new Error("The provider returned an invalid Rewrite & Coach JSON response. Please regenerate.");
}

function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start !== -1 && end > start ? text.slice(start, end + 1) : "";
}

export const REWRITE_TONE_LABELS: Record<RewriteTone, string> = {
  natural: "Natural",
  casual: "Casual",
  formal: "Formal",
  concise: "Concise",
};
