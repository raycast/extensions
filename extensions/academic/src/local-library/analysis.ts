import { AI, environment } from "@raycast/api";
import { createHash } from "node:crypto";
import type { ExtensionPreferences } from "../preferences";
import type { AcademicSettings } from "../lib/settings";
import type {
  AnalysisEngine,
  AnalysisInput,
  AnalysisOutput,
  DocumentAnalysis,
  QuantizedEmbedding,
} from "./types";
import {
  localExtractiveAnalysis,
  tokenizeForLocalAnalysis,
} from "./local-analysis";

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    topics: { type: "array", items: { type: "string" } },
    methods: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "keyPoints", "keywords", "topics", "methods"],
};

export async function analyzeDocument(
  input: AnalysisInput,
  settings: AcademicSettings,
  preferences: ExtensionPreferences,
): Promise<DocumentAnalysis> {
  const requested = settings.analysisEngine;
  let engine: AnalysisEngine = requested;
  let model: string | undefined;
  let output: AnalysisOutput;
  try {
    if (requested === "ollama") {
      assertLocalOrConsented(settings.ollamaBaseUrl, settings);
      model = settings.ollamaModel;
      output = await analyzeWithOllama(input, settings.ollamaBaseUrl, model);
    } else if (requested === "raycast") {
      assertExternalConsent(settings);
      output = await analyzeWithRaycast(input);
    } else if (requested === "openai") {
      assertExternalConsent(settings);
      model = preferences.openAIModel?.trim() || "gpt-5.6-luna";
      output = await analyzeWithOpenAI(input, preferences.openAIApiKey, model);
    } else if (requested === "anthropic") {
      assertExternalConsent(settings);
      model = preferences.anthropicModel?.trim() || "claude-haiku-4-5-20251001";
      output = await analyzeWithAnthropic(
        input,
        preferences.anthropicApiKey,
        model,
      );
    } else if (requested === "gemini") {
      assertExternalConsent(settings);
      model = preferences.geminiModel?.trim() || "gemini-3.8-flash";
      output = await analyzeWithGemini(input, preferences.geminiApiKey, model);
    } else {
      output = localExtractiveAnalysis(input);
    }
  } catch {
    // Indexing must remain useful when a paid service, local model, or network is unavailable.
    engine = "local";
    model = undefined;
    output = localExtractiveAnalysis(input);
  }
  return {
    ...output,
    engine,
    model,
    analyzedAt: new Date().toISOString(),
    inputFingerprint: input.fingerprint,
  };
}

export async function createEmbedding(
  input: AnalysisInput,
  analysis: AnalysisOutput,
  settings: AcademicSettings,
): Promise<QuantizedEmbedding> {
  const value = [
    input.title,
    input.authors.join(" "),
    analysis.summary,
    analysis.keywords.join(" "),
    analysis.topics.join(" "),
  ]
    .filter(Boolean)
    .join("\n");
  if (settings.analysisEngine === "ollama") {
    try {
      assertLocalOrConsented(settings.ollamaBaseUrl, settings);
      const base = normalizeBaseUrl(settings.ollamaBaseUrl);
      const response = await fetchWithTimeout(`${base}/api/embed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: settings.ollamaEmbeddingModel,
          input: value,
          truncate: true,
        }),
      });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      const data = (await response.json()) as { embeddings?: number[][] };
      if (!data.embeddings?.[0]?.length)
        throw new Error("No Ollama embedding returned");
      return quantize(
        data.embeddings[0],
        "ollama",
        settings.ollamaEmbeddingModel,
      );
    } catch {
      // A deterministic local embedding keeps semantic search available as a fallback.
    }
  }
  return quantize(localHashEmbedding(value), "local", "academic-hash-v1");
}

export async function detectOllama(
  baseUrl: string,
): Promise<{ available: boolean; models: string[]; error?: string }> {
  try {
    const response = await fetchWithTimeout(
      `${normalizeBaseUrl(baseUrl)}/api/tags`,
      {},
      2_500,
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as {
      models?: Array<{ name?: string }>;
    };
    return {
      available: true,
      models: (data.models ?? [])
        .map((model) => model.name ?? "")
        .filter(Boolean),
    };
  } catch (error) {
    return {
      available: false,
      models: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function assertExternalConsent(settings: AcademicSettings): void {
  if (!settings.allowExternalAnalysis)
    throw new Error("External analysis has not been authorized");
}

function assertLocalOrConsented(
  baseUrl: string,
  settings: AcademicSettings,
): void {
  const hostname = new URL(normalizeBaseUrl(baseUrl)).hostname;
  const local = ["127.0.0.1", "localhost", "::1"].includes(hostname);
  if (!local && !settings.allowExternalAnalysis)
    throw new Error(
      "A remote Ollama-compatible server requires external processing consent",
    );
}

async function analyzeWithOllama(
  input: AnalysisInput,
  baseUrl: string,
  model: string,
): Promise<AnalysisOutput> {
  const response = await fetchWithTimeout(
    `${normalizeBaseUrl(baseUrl)}/api/chat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        keep_alive: "2m",
        format: ANALYSIS_SCHEMA,
        options: { temperature: 0, num_ctx: 4096 },
        messages: [{ role: "user", content: analysisPrompt(input) }],
      }),
    },
    120_000,
  );
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const data = (await response.json()) as { message?: { content?: string } };
  return parseAnalysis(data.message?.content ?? "");
}

async function analyzeWithRaycast(
  input: AnalysisInput,
): Promise<AnalysisOutput> {
  if (!environment.canAccess(AI)) throw new Error("Raycast AI is unavailable");
  return parseAnalysis(
    await AI.ask(analysisPrompt(input), { creativity: "none" }),
  );
}

async function analyzeWithOpenAI(
  input: AnalysisInput,
  apiKey: string | undefined,
  model: string,
): Promise<AnalysisOutput> {
  if (!apiKey?.trim()) throw new Error("OpenAI API key is missing");
  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey.trim()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: analysisPrompt(input),
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "academic_document_analysis",
            strict: true,
            schema: ANALYSIS_SCHEMA,
          },
          verbosity: "low",
        },
      }),
    },
    90_000,
  );
  if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  return parseAnalysis(
    data.output_text ??
      data.output
        ?.flatMap((item) => item.content ?? [])
        .map((item) => item.text ?? "")
        .join("") ??
      "",
  );
}

async function analyzeWithAnthropic(
  input: AnalysisInput,
  apiKey: string | undefined,
  model: string,
): Promise<AnalysisOutput> {
  if (!apiKey?.trim()) throw new Error("Anthropic API key is missing");
  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        messages: [{ role: "user", content: analysisPrompt(input) }],
      }),
    },
    90_000,
  );
  if (!response.ok) throw new Error(`Anthropic returned ${response.status}`);
  const data = (await response.json()) as {
    content?: Array<{ text?: string }>;
  };
  return parseAnalysis(
    data.content?.map((item) => item.text ?? "").join("") ?? "",
  );
}

async function analyzeWithGemini(
  input: AnalysisInput,
  apiKey: string | undefined,
  model: string,
): Promise<AnalysisOutput> {
  if (!apiKey?.trim()) throw new Error("Gemini API key is missing");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey.trim(),
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: analysisPrompt(input) }] }],
      }),
    },
    90_000,
  );
  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return parseAnalysis(
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? "",
  );
}

function analysisPrompt(input: AnalysisInput): string {
  const excerpt = cleanText(input.text).slice(0, 18_000);
  return `Analyze this academic record and excerpt. Return only JSON matching this schema: ${JSON.stringify(ANALYSIS_SCHEMA)}. Do not invent claims not supported by the supplied text. Summary must be no more than 180 words.\n\nTitle: ${input.title ?? "Unknown"}\nAuthors: ${input.authors.join(", ") || "Unknown"}\nType: ${input.kind ?? "Unknown"}\nExisting abstract: ${input.abstract ?? "None"}\n\nExtracted text:\n${excerpt}`;
}

function parseAnalysis(value: string): AnalysisOutput {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end <= start)
    throw new Error("The analysis did not return JSON");
  const parsed = JSON.parse(
    value.slice(start, end + 1),
  ) as Partial<AnalysisOutput>;
  if (typeof parsed.summary !== "string")
    throw new Error("The analysis summary is missing");
  return {
    summary: parsed.summary.trim().slice(0, 2_000),
    keyPoints: stringArray(parsed.keyPoints, 8),
    keywords: stringArray(parsed.keywords, 20),
    topics: stringArray(parsed.topics, 16),
    methods: stringArray(parsed.methods, 12),
  };
}

function stringArray(value: unknown, limit: number): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function localHashEmbedding(value: string, dimensions = 256): number[] {
  const vector = Array.from({ length: dimensions }, () => 0);
  for (const token of tokenizeForLocalAnalysis(value)) {
    const digest = createHash("sha256").update(token).digest();
    const index = digest.readUInt32BE(0) % dimensions;
    const sign = digest[4] % 2 ? 1 : -1;
    vector[index] += sign;
  }
  const norm =
    Math.sqrt(vector.reduce((total, number) => total + number * number, 0)) ||
    1;
  return vector.map((number) => number / norm);
}

function quantize(
  vector: number[],
  engine: QuantizedEmbedding["engine"],
  model: string,
): QuantizedEmbedding {
  const maximum = Math.max(...vector.map(Math.abs), 0.000001);
  const scale = maximum / 127;
  const bytes = Uint8Array.from(
    vector.map(
      (value) => Math.max(-127, Math.min(127, Math.round(value / scale))) + 128,
    ),
  );
  return {
    engine,
    model,
    dimensions: vector.length,
    scale,
    values: Buffer.from(bytes).toString("base64"),
  };
}

function cleanText(value: string): string {
  return value.replace(/\0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeBaseUrl(value: string): string {
  return (value.trim() || "http://127.0.0.1:11434").replace(/\/$/, "");
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeout = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
