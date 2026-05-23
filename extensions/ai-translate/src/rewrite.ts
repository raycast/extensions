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
  const cleaned = raw.trim();
  const candidates = [
    cleaned,
    stripCodeFence(raw),
    extractBalancedJson(cleaned),
    extractBalancedJson(stripCodeFence(raw)),
    extractJsonObject(cleaned),
  ];

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

  const preview = cleaned.replace(/\s+/g, " ").slice(0, 200);
  throw new Error(
    `The provider returned an invalid Rewrite & Coach JSON response. Please regenerate. (got: ${preview || "empty response"})`,
  );
}

function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

/** Greedy first-to-last brace; cheap but breaks on responses containing two JSON-ish blocks. */
function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start !== -1 && end > start ? text.slice(start, end + 1) : "";
}

/** Walk the response to the matching close brace, ignoring braces inside JSON strings. */
function extractBalancedJson(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) return "";

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return "";
}

export const REWRITE_TONE_LABELS: Record<RewriteTone, string> = {
  natural: "Natural",
  casual: "Casual",
  formal: "Formal",
  concise: "Concise",
};
