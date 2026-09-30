import { Cache } from "@raycast/api";
import type { JSONValue } from "ai";
import { z } from "zod";
import type { Format } from "./console";

// Mirrors OpenCode's Variant.resolve (packages/core/src/variant.ts): models.dev lists which reasoning
// options each model supports, and the API format decides how each option is sent.

const MODELS_DEV_URL = "https://models.dev/api.json";
const CACHE_KEY = "reasoning-variants";
const SUPPORT_CACHE_KEY = "reasoning-support";
const SUPPORT_TTL = 30 * 60 * 1000;
const EFFORTS = ["low", "medium", "high"];
const ADAPTIVE_THINKING = { type: "adaptive", display: "summarized" };
const ANTHROPIC_OUTPUT_TOKEN_MAX = 32_000;

const cache = new Cache();

const Support = z.discriminatedUnion("type", [
  z.object({ type: z.literal("effort"), values: z.array(z.string().nullable()).optional() }),
  z.object({ type: z.literal("toggle") }),
  z.object({ type: z.literal("budget_tokens"), min: z.number().optional(), max: z.number().optional() }),
]);
type Support = z.infer<typeof Support>;

const ModelsDev = z.object({
  opencode: z.object({
    models: z.record(z.string(), z.object({ reasoning_options: z.array(z.unknown()).optional() })),
  }),
});

type Options = Record<string, Record<string, JSONValue>>;
type Variant = [id: string, options: Options];
type Model = { id: string; format: Format; outputLimit?: number };
type Protocol = (model: Model, support: Support) => Variant[];

type SupportCache = { fetchedAt: number; etag: string | null; supports: Record<string, Support[]> };

export async function loadReasoningSupport(): Promise<Record<string, Support[]>> {
  const cached = readSupportCache();
  if (cached && Date.now() - cached.fetchedAt < SUPPORT_TTL) return cached.supports;
  try {
    // models.dev has no per-provider endpoint, so revalidate with the ETag to skip re-downloading the whole catalog.
    const response = await fetch(MODELS_DEV_URL, {
      headers: cached?.etag ? { "If-None-Match": cached.etag } : {},
      signal: AbortSignal.timeout(3_000),
    });
    if (response.status === 304 && cached) return writeSupportCache({ ...cached, fetchedAt: Date.now() });
    if (!response.ok) return cached?.supports ?? {};
    const { opencode } = ModelsDev.parse(await response.json());
    const supports = Object.fromEntries(
      Object.entries(opencode.models).map(([id, model]) => [
        id,
        (model.reasoning_options ?? []).flatMap((option) => {
          const parsed = Support.safeParse(option);
          return parsed.success ? [parsed.data] : [];
        }),
      ]),
    );
    return writeSupportCache({ fetchedAt: Date.now(), etag: response.headers.get("etag"), supports });
  } catch {
    // Reasoning controls are optional; models still load without them.
    return cached?.supports ?? {};
  }
}

function readSupportCache(): SupportCache | undefined {
  const value = cache.get(SUPPORT_CACHE_KEY);
  return value ? (JSON.parse(value) as SupportCache) : undefined;
}

function writeSupportCache(value: SupportCache) {
  cache.set(SUPPORT_CACHE_KEY, JSON.stringify(value));
  return value.supports;
}

export function resolveVariants(model: Model, supports: Support[]): Variant[] {
  const protocol = PROTOCOLS[model.format];
  const toggle = supports.some((support) => support.type === "toggle") ? protocol(model, { type: "toggle" }) : [];
  const effort = supports.find((support) => support.type === "effort");
  const budget = supports.find((support) => support.type === "budget_tokens");
  const main = effort ? protocol(model, effort) : budget ? protocol(model, budget) : toggle;
  const variants = [...toggle.filter(([id]) => id === "none"), ...main];
  return variants.filter(([id], index) => variants.findIndex(([other]) => other === id) === index);
}

// Raycast needs a default; pick the level each provider uses when none is sent.
export function defaultEffort(format: Format, efforts: string[]) {
  const preferred = format === "openai" ? ["medium", "high"] : ["high", "medium"];
  return preferred.find((effort) => efforts.includes(effort)) ?? efforts[efforts.length - 1];
}

// streamCompletion only receives the model ID, so the resolved options are kept for it here.
export function saveVariants(variants: Record<string, Record<string, Options>>) {
  cache.set(CACHE_KEY, JSON.stringify(variants));
}

export function variantOptions(modelID: string, effort: string): Options | undefined {
  const variants = cache.get(CACHE_KEY);
  return variants ? (JSON.parse(variants) as Record<string, Record<string, Options>>)[modelID]?.[effort] : undefined;
}

const efforts = (
  support: Extract<Support, { type: "effort" }>,
  fallback: string[],
  spell: (effort: string) => Options,
) =>
  (support.values?.filter((value): value is string => value !== null && value !== "null") ?? fallback).map(
    (effort): Variant => [effort, spell(effort)],
  );

const toggle = (off: Options, on: Options): Variant[] => [
  ["none", off],
  ["thinking", on],
];

function budgets(
  model: Model,
  support: Extract<Support, { type: "budget_tokens" }>,
  spell: (tokens: number) => Options,
  ceiling = model.outputLimit ?? 0,
): Variant[] {
  const output = model.outputLimit ?? 0;
  const maximum = Math.min(support.max ?? ceiling - 1, output - 1, ceiling - 1);
  if (maximum <= 0) return [];
  const high = Math.min(Math.max(support.min ?? 0, Math.floor((maximum + 1) / 2)), maximum);
  return [
    ["high", spell(high)],
    ["max", spell(maximum)],
  ];
}

// Claude 4.5 and older (manual thinking budgets) aren't in the managed catalog.
const anthropic: Protocol = (model, support) => {
  switch (support.type) {
    case "effort": {
      const legacy = /(?:opus|sonnet|haiku)-4[.-]6/i.test(model.id);
      return efforts(support, legacy ? [...EFFORTS, "max"] : [...EFFORTS, "xhigh", "max"], (effort) => ({
        anthropic: { thinking: ADAPTIVE_THINKING, effort },
      }));
    }
    case "toggle":
      if (/fable|mythos/i.test(model.id)) return [];
      return toggle({ anthropic: { thinking: { type: "disabled" } } }, { anthropic: { thinking: ADAPTIVE_THINKING } });
    case "budget_tokens":
      return budgets(
        model,
        support,
        (budgetTokens) => ({ anthropic: { thinking: { type: "enabled", budgetTokens } } }),
        ANTHROPIC_OUTPUT_TOKEN_MAX,
      );
  }
};

const openai: Protocol = (_, support) => {
  if (support.type !== "effort") return [];
  // forceReasoning: the SDK drops reasoning settings for model IDs it doesn't recognize as reasoning models.
  return efforts(support, ["none", "minimal", ...EFFORTS, "xhigh"], (reasoningEffort) => ({
    openai: { reasoningEffort, reasoningSummary: "auto", forceReasoning: true },
  }));
};

const google: Protocol = (model, support) => {
  switch (support.type) {
    case "effort":
      return efforts(support, EFFORTS, (thinkingLevel) => ({
        google: { thinkingConfig: { includeThoughts: true, thinkingLevel } },
      }));
    case "toggle":
      return toggle(
        { google: { thinkingConfig: { includeThoughts: false, thinkingBudget: 0 } } },
        { google: { thinkingConfig: { includeThoughts: true, thinkingBudget: -1 } } },
      );
    case "budget_tokens":
      return budgets(model, support, (thinkingBudget) => ({
        google: { thinkingConfig: { includeThoughts: true, thinkingBudget } },
      }));
  }
};

const openaiCompatible: Protocol = (_, support) => {
  if (support.type !== "effort") return [];
  return efforts(support, EFFORTS, (reasoningEffort) => ({ opencode: { reasoningEffort } }));
};

const PROTOCOLS: Record<Format, Protocol> = {
  anthropic,
  openai,
  google,
  "openai-compatible": openaiCompatible,
};
