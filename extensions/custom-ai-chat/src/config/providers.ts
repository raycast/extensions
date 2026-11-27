import { getPreferenceValues } from "@raycast/api";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseDocument } from "yaml";
import { getErrorMessage, isHttpUrl, isNodeError, isRecord } from "../lib/guards";
import type { CatalogResult, ModelRef } from "../types";

function expandHome(value: string): string {
  if (value === "~") {
    return os.homedir();
  }
  if (value.startsWith("~/")) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

export function getProvidersPath(): string {
  const { configPath, defaultConfigPath } = getPreferenceValues<Preferences>();

  const selected = configPath?.trim() || defaultConfigPath.trim();
  if (selected) {
    return expandHome(selected);
  }
  return path.join(os.homedir(), ".config", "raycast", "ai", "providers.yaml");
}

export function normalizeBaseUrl(value: string): string {
  let url = value.trim().replace(/\/+$/, "");
  if (url.endsWith("/chat/completions")) {
    url = url.slice(0, -"/chat/completions".length).replace(/\/+$/, "");
  }
  return url;
}

export function parseProviders(raw: string, filePath: string = getProvidersPath()): CatalogResult {
  const document = parseDocument(raw);

  if (document.errors.length > 0) {
    const first = document.errors[0];
    const position = first.linePos?.[0];
    const location = position ? ` (line ${position.line}, column ${position.col})` : "";
    return {
      status: "parse-error",
      path: filePath,
      message: `Failed to parse YAML${location}: ${first.message}`,
    };
  }

  let data: unknown;
  try {
    data = document.toJS();
  } catch (error) {
    return {
      status: "parse-error",
      path: filePath,
      message: getErrorMessage(error, "Could not parse providers.yaml"),
    };
  }

  if (!isRecord(data) || !Array.isArray(data.providers)) {
    return {
      status: "parse-error",
      path: filePath,
      message: "The providers field is missing or is not an array",
    };
  }

  const models: ModelRef[] = [];
  const issues: string[] = [];
  const seenKeys = new Map<string, number>();

  data.providers.forEach((provider, providerIndex) => {
    if (!isRecord(provider)) {
      issues.push(`providers[${providerIndex}] is not an object`);
      return;
    }

    const providerId = typeof provider.id === "string" ? provider.id.trim() : "";
    if (!providerId) {
      issues.push(`providers[${providerIndex}] is missing an id`);
      return;
    }

    const providerName = typeof provider.name === "string" && provider.name.trim() ? provider.name.trim() : providerId;
    const baseUrl = typeof provider.base_url === "string" ? normalizeBaseUrl(provider.base_url) : "";
    if (!baseUrl || !isHttpUrl(baseUrl)) {
      issues.push(`${providerId} has an invalid base_url`);
      return;
    }

    if (!Array.isArray(provider.models) || provider.models.length === 0) {
      issues.push(`${providerId} has no models`);
      return;
    }

    const apiKeys = isRecord(provider.api_keys) ? provider.api_keys : {};
    const firstApiKeyEntry = Object.entries(apiKeys).find(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0,
    );

    provider.models.forEach((model, modelIndex) => {
      if (!isRecord(model)) {
        issues.push(`${providerId} models[${modelIndex}] is not an object`);
        return;
      }

      const modelId = typeof model.id === "string" ? model.id.trim() : "";
      if (!modelId) {
        issues.push(`${providerId} models[${modelIndex}] is missing an id`);
        return;
      }

      const modelName = typeof model.name === "string" && model.name.trim() ? model.name.trim() : modelId;
      const keyAlias = typeof model.provider === "string" ? model.provider.trim() : "";
      const matchedAlias = keyAlias && typeof apiKeys[keyAlias] === "string" ? keyAlias : undefined;
      const rawApiKey = matchedAlias ? apiKeys[matchedAlias] : firstApiKeyEntry?.[1];
      const apiKeyAlias = matchedAlias ?? firstApiKeyEntry?.[0];
      const apiKey =
        typeof rawApiKey === "string" && rawApiKey.length > 0 ? (process.env[rawApiKey] ?? rawApiKey) : undefined;

      const baseKey = `${providerId}::${modelId}`;
      const duplicateCount = seenKeys.get(baseKey) ?? 0;
      seenKeys.set(baseKey, duplicateCount + 1);
      const key = duplicateCount === 0 ? baseKey : `${baseKey}#${duplicateCount + 1}`;

      models.push({
        key,
        providerId,
        providerName,
        modelId,
        modelName,
        baseUrl,
        apiKey,
        apiKeyAlias,
      });
    });
  });

  if (models.length === 0) {
    return {
      status: "empty",
      path: filePath,
      message: issues[0] ?? "No available models in providers.yaml",
      issues,
    };
  }

  return { status: "ready", path: filePath, models, issues };
}

function catalogReadError(filePath: string, error: unknown): CatalogResult {
  if (isNodeError(error) && error.code === "ENOENT") {
    return { status: "missing", path: filePath, message: "providers.yaml was not found" };
  }
  return {
    status: "io-error",
    path: filePath,
    message: getErrorMessage(error, "Failed to read providers.yaml"),
  };
}

export async function loadModelCatalog(): Promise<CatalogResult> {
  const filePath = getProvidersPath();

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    return catalogReadError(filePath, error);
  }

  return parseProviders(raw, filePath);
}

export function loadModelCatalogSync(): CatalogResult {
  const filePath = getProvidersPath();

  let raw: string;
  try {
    raw = fsSync.readFileSync(filePath, "utf8");
  } catch (error) {
    return catalogReadError(filePath, error);
  }

  return parseProviders(raw, filePath);
}
