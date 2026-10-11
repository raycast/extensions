import type { AI } from "@raycast/api";
import { modelTitle } from "./model-title";

const timeoutMessage = "Mistral model discovery timed out. Try Refresh Mistral Models again.";

function catalogTitle(id: string, name?: string): string {
  return modelTitle(id, name).replace(/\s+\((?:latest|\d{4})\)$/i, "");
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export async function discoverModels(apiKey: string): Promise<AI.RegisteredModel[]> {
  if (!apiKey.trim()) throw new Error("Add your Mistral API key in the Mistral Models extension preferences.");

  const signal = AbortSignal.timeout(15000);
  let response: Response;
  try {
    response = await fetch("https://api.mistral.ai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey.trim()}`, Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === "TimeoutError")) {
      throw new Error(timeoutMessage);
    }
    throw new Error("Could not connect to Mistral. Check your connection and try Refresh Mistral Models again.");
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Mistral denied model discovery. Check your API key and account access.");
    }
    throw new Error(`Could not load Mistral models (HTTP ${response.status}). Try Refresh Mistral Models again.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === "TimeoutError")) {
      throw new Error(timeoutMessage);
    }
    throw new Error("Mistral returned an unreadable model catalog.");
  }
  const data = record(payload)?.data;
  if (!Array.isArray(data)) throw new Error("Mistral returned an invalid model catalog.");

  const discovered = new Map<string, AI.RegisteredModel>();
  for (const item of data) {
    const card = record(item);
    const capabilities = record(card?.capabilities);
    if (!card || capabilities?.completion_chat !== true || card.archived === true) continue;
    if (typeof card.id !== "string" || !card.id.endsWith("-latest")) continue;
    const title = catalogTitle(card.id, typeof card.name === "string" ? card.name : undefined);
    if (/^(codestral|voxtral|mistral-code)-/i.test(card.id) || /\b(codestral|voxtral)\b/i.test(title)) continue;
    discovered.set(card.id, {
      id: card.id,
      title,
      description: typeof card.description === "string" ? card.description : undefined,
      icon: { source: { light: "extension-icon.png", dark: "extension-icon.png" } },
      isLocal: false,
      contextWindow:
        typeof card.max_context_length === "number" &&
        Number.isFinite(card.max_context_length) &&
        card.max_context_length > 0
          ? card.max_context_length
          : undefined,
      capabilities: {
        systemMessage: { supported: true },
        temperature: { supported: true },
        streaming: { supported: true },
        tools: { supported: capabilities.function_calling === true },
        ...(capabilities.vision === true
          ? {
              vision: {
                mediaTypes: ["image/png", "image/jpeg", "image/webp"] as ("image/png" | "image/jpeg" | "image/webp")[],
              },
            }
          : {}),
      },
    });
  }
  const byTitle = new Map<string, AI.RegisteredModel>();
  // Present one choice per display name. Prefer the matching family ID;
  // stable ID order breaks ties independently of the API response order.
  for (const model of [...discovered.values()].sort((left, right) => left.id.localeCompare(right.id))) {
    const key = model.title.toLowerCase();
    const existing = byTitle.get(key);
    const matchesFamily = catalogTitle(model.id).toLowerCase() === key;
    if (!existing || (matchesFamily && catalogTitle(existing.id).toLowerCase() !== key)) {
      byTitle.set(key, model);
    }
  }
  return [...byTitle.values()].sort((left, right) => left.title.localeCompare(right.title));
}
