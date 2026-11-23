import fs from "node:fs/promises";
import path from "node:path";
import { isMap, isScalar, isSeq, parseDocument } from "yaml";
import type { Document, YAMLMap, YAMLSeq } from "yaml";
import { isHttpUrl, isNodeError } from "../lib/guards";
import { getProvidersPath, normalizeBaseUrl } from "./providers";

export interface AddModelInput {
  baseUrl: string;
  apiKey?: string;
  modelId: string;
  alias?: string;
}

export interface AddModelResult {
  path: string;
  providerId: string;
  modelId: string;
  createdProvider: boolean;
}

export interface UpdateModelTarget {
  providerId: string;
  modelId: string;
}

export interface UpdateModelResult {
  path: string;
  providerId: string;
  modelId: string;
  providerChanged: boolean;
}

export interface DeleteModelResult {
  path: string;
  providerId: string;
  modelId: string;
  providerDeleted: boolean;
}

function formatYamlErrors(errors: readonly Error[]): string {
  const first = errors[0];
  if (!first) {
    return "Unknown YAML error";
  }

  const position =
    "linePos" in first ? (first as { linePos?: Array<{ line: number; col: number }> }).linePos?.[0] : undefined;
  return position ? `line ${position.line}, column ${position.col}: ${first.message}` : first.message;
}

const MULTI_PART_SUFFIXES = new Set(["co", "com", "net", "org", "gov", "edu", "ac"]);

export function deriveProviderIdentity(baseUrl: string): { id: string; name: string } {
  const url = new URL(baseUrl);
  const hostname = url.hostname.toLowerCase();
  const parts = hostname.split(".").filter(Boolean);
  const isIp = /^[\d.]+$/.test(hostname) || hostname.includes(":");

  let label: string;
  if (isIp || parts.length <= 1) {
    label = url.host;
  } else {
    let index = parts.length - 2;
    if (MULTI_PART_SUFFIXES.has(parts[index]) && parts.length >= 3) {
      index -= 1;
    }
    label = parts[index];
  }

  const id =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "provider";
  return { id, name: id };
}

function normalizeInput(input: AddModelInput) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const apiKey = input.apiKey?.trim() || undefined;
  const modelId = input.modelId.trim();
  const alias = input.alias?.trim() || undefined;

  if (!baseUrl || !isHttpUrl(baseUrl)) {
    throw new Error("Base URL must be a valid http or https address");
  }
  if (!modelId) {
    throw new Error("Model ID cannot be empty");
  }

  return { baseUrl, apiKey, modelId, alias };
}

function buildModelData(modelId: string, alias?: string): Record<string, unknown> {
  return {
    id: modelId,
    name: modelId,
    ...(alias ? { provider: alias } : {}),
    abilities: {
      temperature: { supported: true },
      vision: { supported: false },
      system_message: { supported: true },
      tools: { supported: false },
      reasoning_effort: { supported: false },
    },
  };
}

interface LoadedConfig {
  document: Document.Parsed;
  targetPath: string;
  raw: string | null;
  providers: YAMLSeq;
}

async function prepareConfigTarget(
  filePath: string,
  ignoreReadErrors: boolean,
): Promise<{ targetPath: string; raw: string | null }> {
  let targetPath = filePath;
  try {
    targetPath = await fs.realpath(filePath);
  } catch {
    targetPath = filePath;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true, mode: 0o700 });

  let raw: string | null = null;
  try {
    raw = await fs.readFile(targetPath, "utf8");
  } catch (error) {
    if (!ignoreReadErrors && (!isNodeError(error) || error.code !== "ENOENT")) {
      throw error;
    }
  }

  return { targetPath, raw };
}

async function loadConfig(filePath: string): Promise<LoadedConfig> {
  const { targetPath, raw } = await prepareConfigTarget(filePath, false);

  const document = parseDocument(raw ?? "providers: []\n", { keepSourceTokens: true });
  if (document.errors.length > 0) {
    throw new Error(`Failed to parse providers.yaml: ${formatYamlErrors(document.errors)}`);
  }

  let providers = document.get("providers");
  if (providers === null || providers === undefined) {
    const sequence = document.createNode([]);
    document.set("providers", sequence);
    providers = sequence;
  }
  if (!isSeq(providers)) {
    throw new Error("The providers field in providers.yaml is not an array");
  }

  return { document, targetPath, raw, providers };
}

async function ensureOriginalBackup(targetPath: string, raw: string | null): Promise<void> {
  const directory = path.dirname(targetPath);
  const base = path.basename(targetPath);
  const originalBackup = path.join(directory, `${base}.bak`);

  if (raw !== null) {
    try {
      await fs.access(originalBackup);
    } catch {
      await fs.copyFile(targetPath, originalBackup);
      await fs.chmod(originalBackup, 0o600).catch(() => undefined);
    }
  }
}

async function writeConfig(document: Document.Parsed, targetPath: string, raw: string | null): Promise<void> {
  const output = document.toString({ indent: 2, lineWidth: 0 });
  const verification = parseDocument(output);
  if (verification.errors.length > 0) {
    throw new Error(`Pre-write validation failed: ${formatYamlErrors(verification.errors)}`);
  }

  await ensureOriginalBackup(targetPath, raw);

  const directory = path.dirname(targetPath);
  const tempPath = path.join(directory, `.providers-${process.pid}-${Date.now()}.tmp`);

  try {
    await fs.writeFile(tempPath, output, { mode: 0o600 });
    await fs.rename(tempPath, targetPath);
    await fs.chmod(targetPath, 0o600).catch(() => undefined);

    const written = await fs.readFile(targetPath, "utf8");
    const check = parseDocument(written);
    if (check.errors.length > 0) {
      throw new Error(`Post-write validation failed: ${formatYamlErrors(check.errors)}`);
    }
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    if (raw !== null) {
      await fs.writeFile(targetPath, raw, { mode: 0o600 }).catch(() => undefined);
    } else {
      await fs.rm(targetPath, { force: true }).catch(() => undefined);
    }
    throw error;
  }
}

export async function resetProvidersConfig(filePath: string = getProvidersPath()): Promise<{ path: string }> {
  const { targetPath, raw } = await prepareConfigTarget(filePath, true);

  const document = parseDocument("providers: []\n", { keepSourceTokens: true });
  await writeConfig(document, targetPath, raw);
  return { path: targetPath };
}

function findProviderByBaseUrl(providers: YAMLSeq, baseUrl: string): { id: string; node: YAMLMap } | undefined {
  for (const item of providers.items) {
    if (!isMap(item)) {
      continue;
    }
    const raw = item.get("base_url");
    if (typeof raw !== "string" || !raw.trim()) {
      continue;
    }
    if (normalizeBaseUrl(raw) !== baseUrl) {
      continue;
    }
    const idValue = item.get("id");
    const id = typeof idValue === "string" && idValue.trim() ? idValue.trim() : "";
    if (id) {
      return { id, node: item };
    }
  }
  return undefined;
}

function findProviderIndex(providers: YAMLSeq, providerId: string): number {
  return providers.items.findIndex((item) => isMap(item) && item.get("id") === providerId);
}

function uniqueProviderId(providers: YAMLSeq, baseId: string): string {
  let id = baseId;
  let suffix = 2;
  while (findProviderIndex(providers, id) >= 0) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function getApiKeyAliases(provider: YAMLMap): string[] {
  const raw = provider.get("api_keys");
  if (!isMap(raw)) {
    return [];
  }
  return raw.items.map((pair) => (isScalar(pair.key) ? String(pair.key.value) : "")).filter((key) => key.length > 0);
}

function resolveTargetAlias(provider: YAMLMap, providerId: string, requested?: string): string {
  const aliases = getApiKeyAliases(provider);
  if (aliases.length === 0) {
    return requested ?? providerId;
  }
  return requested && aliases.includes(requested) ? requested : aliases[0];
}

function setApiKey(
  document: Document.Parsed,
  provider: YAMLMap,
  providerId: string,
  apiKey: string,
  alias?: string,
): void {
  const existing = provider.get("api_keys");
  const aliases = getApiKeyAliases(provider);

  if (isMap(existing) && aliases.length > 0) {
    const target = alias && aliases.includes(alias) ? alias : aliases[0];
    existing.set(target, apiKey);
    return;
  }

  provider.set("api_keys", document.createNode({ [alias ?? providerId]: apiKey }));
}

export async function addModelToProvidersYaml(
  input: AddModelInput,
  filePath: string = getProvidersPath(),
): Promise<AddModelResult> {
  const normalized = normalizeInput(input);
  const { document, targetPath, raw, providers } = await loadConfig(filePath);

  const identity = deriveProviderIdentity(normalized.baseUrl);
  const matched = findProviderByBaseUrl(providers, normalized.baseUrl);

  let providerId: string;
  let createdProvider = false;

  if (matched) {
    providerId = matched.id;
    const provider = matched.node;

    let models = provider.get("models");
    if (models === null || models === undefined) {
      const sequence = document.createNode([]);
      provider.set("models", sequence);
      models = sequence;
    }
    if (!isSeq(models)) {
      throw new Error(`Provider "${providerId}" has models that are not an array`);
    }
    if (models.items.some((item) => isMap(item) && item.get("id") === normalized.modelId)) {
      throw new Error(`Model "${normalized.modelId}" already exists in provider "${providerId}"`);
    }

    if (normalized.apiKey) {
      setApiKey(document, provider, providerId, normalized.apiKey);
    }

    models.add(document.createNode(buildModelData(normalized.modelId)));
  } else {
    providerId = uniqueProviderId(providers, identity.id);
    createdProvider = true;

    const providerData: Record<string, unknown> = {
      id: providerId,
      name: identity.name,
      base_url: normalized.baseUrl,
    };
    if (normalized.apiKey) {
      providerData.api_keys = { [providerId]: normalized.apiKey };
    }
    providerData.models = [buildModelData(normalized.modelId)];

    providers.add(document.createNode(providerData));
  }

  await writeConfig(document, targetPath, raw);

  return {
    path: targetPath,
    providerId,
    modelId: normalized.modelId,
    createdProvider,
  };
}

export async function updateModelInProvidersYaml(
  input: AddModelInput,
  target: UpdateModelTarget,
  filePath: string = getProvidersPath(),
): Promise<UpdateModelResult> {
  const normalized = normalizeInput(input);
  const { document, targetPath, raw, providers } = await loadConfig(filePath);

  const sourceIndex = findProviderIndex(providers, target.providerId);
  if (sourceIndex < 0) {
    throw new Error(`Provider "${target.providerId}" not found`);
  }
  const sourceItem = providers.items[sourceIndex];
  if (!isMap(sourceItem)) {
    throw new Error(`Provider "${target.providerId}" has an invalid format`);
  }

  const sourceModels = sourceItem.get("models");
  if (!isSeq(sourceModels)) {
    throw new Error(`Provider "${target.providerId}" has models that are not an array`);
  }
  const modelIndex = sourceModels.items.findIndex((item) => isMap(item) && item.get("id") === target.modelId);
  if (modelIndex < 0) {
    throw new Error(`Model "${target.modelId}" not found in provider "${target.providerId}"`);
  }
  const modelNode = sourceModels.items[modelIndex];
  if (!isMap(modelNode)) {
    throw new Error(`Model "${target.modelId}" has an invalid format`);
  }

  const matched = findProviderByBaseUrl(providers, normalized.baseUrl);
  let destItem: YAMLMap;
  let destProviderId: string;

  if (matched && matched.id === target.providerId) {
    destItem = sourceItem;
    destProviderId = matched.id;
  } else if (matched) {
    destItem = matched.node;
    destProviderId = matched.id;
  } else {
    if (!normalized.apiKey) {
      throw new Error("This Base URL belongs to no configured provider. Enter an API Key for the new address.");
    }

    const identity = deriveProviderIdentity(normalized.baseUrl);
    destProviderId = uniqueProviderId(providers, identity.id);
    const providerData: Record<string, unknown> = {
      id: destProviderId,
      name: identity.name,
      base_url: normalized.baseUrl,
    };
    providerData.models = [];

    providers.add(document.createNode(providerData));
    const added = providers.items[providers.items.length - 1];
    if (!isMap(added)) {
      throw new Error("Failed to create provider");
    }
    destItem = added;
  }

  let destModels = destItem.get("models");
  if (destModels === null || destModels === undefined) {
    const sequence = document.createNode([]);
    destItem.set("models", sequence);
    destModels = sequence;
  }
  if (!isSeq(destModels)) {
    throw new Error(`Provider "${destProviderId}" has models that are not an array`);
  }

  const sameProvider = destItem === sourceItem;
  const conflict = destModels.items.some(
    (item, index) => isMap(item) && item.get("id") === normalized.modelId && !(sameProvider && index === modelIndex),
  );
  if (conflict) {
    throw new Error(`Model "${normalized.modelId}" already exists in provider "${destProviderId}"`);
  }

  const currentName = modelNode.get("name");
  const wasDefaultName = typeof currentName !== "string" || currentName === target.modelId;
  modelNode.set("id", normalized.modelId);
  if (wasDefaultName) {
    modelNode.set("name", normalized.modelId);
  }

  const effectiveAlias = sameProvider ? normalized.alias : undefined;
  if (normalized.apiKey) {
    setApiKey(document, destItem, destProviderId, normalized.apiKey, effectiveAlias);
  }
  if (normalized.apiKey) {
    modelNode.set("provider", resolveTargetAlias(destItem, destProviderId, effectiveAlias));
  } else if (sameProvider && normalized.alias) {
    modelNode.set("provider", normalized.alias);
  }

  if (!sameProvider) {
    sourceModels.delete(modelIndex);
    destModels.add(modelNode);

    if (sourceModels.items.length === 0) {
      providers.delete(sourceIndex);
    }
  }

  await writeConfig(document, targetPath, raw);

  return {
    path: targetPath,
    providerId: destProviderId,
    modelId: normalized.modelId,
    providerChanged: !sameProvider,
  };
}

export async function deleteModelFromProvidersYaml(
  target: UpdateModelTarget,
  filePath: string = getProvidersPath(),
): Promise<DeleteModelResult> {
  const { document, targetPath, raw, providers } = await loadConfig(filePath);

  const providerIndex = findProviderIndex(providers, target.providerId);
  if (providerIndex < 0) {
    throw new Error(`Provider "${target.providerId}" not found`);
  }
  const providerItem = providers.items[providerIndex];
  if (!isMap(providerItem)) {
    throw new Error(`Provider "${target.providerId}" has an invalid format`);
  }

  const models = providerItem.get("models");
  if (!isSeq(models)) {
    throw new Error(`Provider "${target.providerId}" has models that are not an array`);
  }
  const modelIndex = models.items.findIndex((item) => isMap(item) && item.get("id") === target.modelId);
  if (modelIndex < 0) {
    throw new Error(`Model "${target.modelId}" not found in provider "${target.providerId}"`);
  }

  models.delete(modelIndex);

  let providerDeleted = false;
  if (models.items.length === 0) {
    providers.delete(providerIndex);
    providerDeleted = true;
  }

  await writeConfig(document, targetPath, raw);

  return {
    path: targetPath,
    providerId: target.providerId,
    modelId: target.modelId,
    providerDeleted,
  };
}
