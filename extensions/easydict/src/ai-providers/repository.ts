/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { LocalStorage } from "@raycast/api";

import { createTimer } from "@/utils/logger";

import {
  type AIProviderProfile,
  type JSONOutputMode,
  PROVIDER_ICON_NAMES,
  type ProviderIconConfig,
  type StoredAIProviderStateV1,
  type TokenLimitMode,
  type WordResultMode,
} from "./types";

export const AI_PROVIDER_STORAGE_KEY = "ai-provider-profiles";
const LOG_LABEL = "AI Providers";

export type AIProviderLoadResult =
  | { kind: "missing"; state: StoredAIProviderStateV1 }
  | { kind: "ready"; state: StoredAIProviderStateV1 }
  | { kind: "invalid"; rawValue: string; message: string }
  | { kind: "unsupported"; rawValue: string; version: unknown }
  | { kind: "error"; error: Error };

export function createEmptyAIProviderState(): StoredAIProviderStateV1 {
  return { version: 1, profiles: [] };
}

export async function loadAIProviderState(): Promise<AIProviderLoadResult> {
  const timer = createTimer(LOG_LABEL);
  try {
    const rawValue = await LocalStorage.getItem<string>(AI_PROVIDER_STORAGE_KEY);
    if (rawValue === undefined) {
      timer.done("no saved profiles");
      return { kind: "missing", state: createEmptyAIProviderState() };
    }

    let value: unknown;
    try {
      value = JSON.parse(rawValue);
    } catch {
      timer.done("invalid stored configuration");
      return { kind: "invalid", rawValue, message: "The saved provider configuration is not valid JSON." };
    }

    if (!isRecord(value) || value.version !== 1) {
      timer.done("unsupported stored configuration");
      return { kind: "unsupported", rawValue, version: isRecord(value) ? value.version : undefined };
    }
    if (!isStoredAIProviderStateV1(value)) {
      timer.done("invalid stored configuration");
      return { kind: "invalid", rawValue, message: "The saved provider configuration has an invalid shape." };
    }
    timer.done(`loaded ${value.profiles.length} profiles`);
    return { kind: "ready", state: value };
  } catch (error) {
    timer.fail("load failed");
    return { kind: "error", error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function saveAIProviderState(state: StoredAIProviderStateV1): Promise<void> {
  if (!isStoredAIProviderStateV1(state)) {
    throw new Error("Refusing to save an invalid AI provider configuration.");
  }
  await LocalStorage.setItem(AI_PROVIDER_STORAGE_KEY, JSON.stringify(state));
}

export function isStoredAIProviderStateV1(value: unknown): value is StoredAIProviderStateV1 {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.profiles)) return false;
  if (value.providerOrder !== undefined && !isProviderOrder(value.providerOrder)) return false;
  if (value.migration !== undefined) {
    if (!isRecord(value.migration) || typeof value.migration.legacyPreferencesImported !== "boolean") return false;
  }
  if (!value.profiles.every(isAIProviderProfile)) return false;
  const profileIds = value.profiles.map((profile) => profile.id);
  return new Set(profileIds).size === profileIds.length;
}

function isProviderOrder(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((key) => typeof key === "string" && key.trim().length > 0) &&
    new Set(value).size === value.length
  );
}

function isAIProviderProfile(value: unknown): value is AIProviderProfile {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.name !== "string" ||
    !value.name ||
    typeof value.enabled !== "boolean" ||
    typeof value.order !== "number" ||
    !Number.isFinite(value.order) ||
    !isProviderIconConfig(value.icon) ||
    !isWordResultMode(value.wordResultMode)
  ) {
    return false;
  }

  if (value.adapter === "raycast-ai") {
    return typeof value.model === "string" && value.model.length > 0;
  }

  return (
    value.adapter === "openai-compatible" &&
    typeof value.endpoint === "string" &&
    typeof value.model === "string" &&
    typeof value.apiKey === "string" &&
    (value.website === undefined || typeof value.website === "string") &&
    isTokenLimitMode(value.tokenLimitMode) &&
    isJSONOutputMode(value.jsonOutputMode)
  );
}

function isProviderIconConfig(value: unknown): value is ProviderIconConfig {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  switch (value.kind) {
    case "preset":
      return typeof value.name === "string" && PROVIDER_ICON_NAMES.some((name) => name === value.name);
    case "remote":
      return typeof value.url === "string";
    case "favicon":
      return value.website === undefined || typeof value.website === "string";
    case "initials":
      return true;
    default:
      return false;
  }
}

function isTokenLimitMode(value: unknown): value is TokenLimitMode {
  return value === "max-tokens" || value === "max-completion-tokens";
}

function isJSONOutputMode(value: unknown): value is JSONOutputMode {
  return value === "prompt" || value === "json-object";
}

function isWordResultMode(value: unknown): value is WordResultMode {
  return value === "translation" || value === "dictionary";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
