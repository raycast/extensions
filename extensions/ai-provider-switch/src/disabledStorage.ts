import { LocalStorage } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { DisabledConfig, Model, Provider } from "./types";
import { getProvidersPath } from "./yaml";

const DISABLED_STORAGE_KEY = "disabled-config-v1";
const DISABLED_FILE_NAME = "providers.disabled.json";

function emptyDisabledConfig(): DisabledConfig {
  return { providers: [], modelsByProvider: {} };
}

function getDisabledFilePath(): string {
  const providersPath = getProvidersPath();
  return path.join(path.dirname(providersPath), DISABLED_FILE_NAME);
}

function dedupeProviders(providers: Provider[]): Provider[] {
  const map = new Map<string, Provider>();
  for (const provider of providers) {
    map.set(provider.id, provider);
  }
  return Array.from(map.values());
}

function dedupeModels(models: Model[]): Model[] {
  const map = new Map<string, Model>();
  for (const model of models) {
    map.set(model.id, model);
  }
  return Array.from(map.values());
}

function normalizeDisabledConfig(value: unknown): DisabledConfig {
  if (!value || typeof value !== "object") {
    return emptyDisabledConfig();
  }

  const parsed = value as Partial<DisabledConfig>;
  const providers = Array.isArray(parsed.providers)
    ? dedupeProviders(parsed.providers as Provider[])
    : [];
  const modelsByProvider: Record<string, Model[]> = {};

  if (parsed.modelsByProvider && typeof parsed.modelsByProvider === "object") {
    for (const [providerId, models] of Object.entries(
      parsed.modelsByProvider,
    )) {
      if (Array.isArray(models)) {
        modelsByProvider[providerId] = dedupeModels(models as Model[]);
      }
    }
  }

  return { providers, modelsByProvider };
}

function mergeDisabledConfig(
  primary: DisabledConfig,
  secondary: DisabledConfig,
): DisabledConfig {
  const providers = dedupeProviders([
    ...primary.providers,
    ...secondary.providers,
  ]);
  const modelsByProvider: Record<string, Model[]> = {};
  const providerIds = new Set([
    ...Object.keys(primary.modelsByProvider),
    ...Object.keys(secondary.modelsByProvider),
  ]);

  for (const providerId of providerIds) {
    const primaryModels = primary.modelsByProvider[providerId] || [];
    const secondaryModels = secondary.modelsByProvider[providerId] || [];
    const merged = dedupeModels([...primaryModels, ...secondaryModels]);
    if (merged.length > 0) {
      modelsByProvider[providerId] = merged;
    }
  }

  return { providers, modelsByProvider };
}

async function readDisabledFromLocalStorage(): Promise<DisabledConfig> {
  const raw = await LocalStorage.getItem<string>(DISABLED_STORAGE_KEY);
  if (!raw) return emptyDisabledConfig();

  try {
    return normalizeDisabledConfig(JSON.parse(raw));
  } catch {
    return emptyDisabledConfig();
  }
}

function readDisabledFromFile(): DisabledConfig {
  const filePath = getDisabledFilePath();
  if (!fs.existsSync(filePath)) {
    return emptyDisabledConfig();
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return normalizeDisabledConfig(JSON.parse(raw));
  } catch {
    return emptyDisabledConfig();
  }
}

export async function loadDisabledConfig(): Promise<DisabledConfig> {
  const localConfig = await readDisabledFromLocalStorage();
  const fileConfig = readDisabledFromFile();
  return mergeDisabledConfig(localConfig, fileConfig);
}

export async function saveDisabledConfig(
  config: DisabledConfig,
): Promise<void> {
  const normalized = normalizeDisabledConfig(config);
  const json = JSON.stringify(normalized, null, 2);
  const filePath = getDisabledFilePath();
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, json, "utf-8");
  await LocalStorage.setItem(DISABLED_STORAGE_KEY, json);
}

export function addDisabledProvider(
  config: DisabledConfig,
  provider: Provider,
): DisabledConfig {
  const providers = dedupeProviders(
    config.providers.filter((p) => p.id !== provider.id).concat(provider),
  );
  return {
    providers,
    modelsByProvider: { ...config.modelsByProvider },
  };
}

export function removeDisabledProvider(
  config: DisabledConfig,
  providerId: string,
): { nextConfig: DisabledConfig; provider?: Provider } {
  const provider = config.providers.find((p) => p.id === providerId);
  return {
    provider,
    nextConfig: {
      providers: config.providers.filter((p) => p.id !== providerId),
      modelsByProvider: { ...config.modelsByProvider },
    },
  };
}

export function addDisabledModel(
  config: DisabledConfig,
  providerId: string,
  model: Model,
): DisabledConfig {
  const current = config.modelsByProvider[providerId] || [];
  return {
    providers: [...config.providers],
    modelsByProvider: {
      ...config.modelsByProvider,
      [providerId]: dedupeModels(current.concat(model)),
    },
  };
}

export function removeDisabledModel(
  config: DisabledConfig,
  providerId: string,
  modelId: string,
): { nextConfig: DisabledConfig; model?: Model } {
  const current = config.modelsByProvider[providerId] || [];
  const model = current.find((m) => m.id === modelId);
  const remaining = current.filter((m) => m.id !== modelId);
  const modelsByProvider = { ...config.modelsByProvider };

  if (remaining.length === 0) {
    delete modelsByProvider[providerId];
  } else {
    modelsByProvider[providerId] = remaining;
  }

  return {
    model,
    nextConfig: {
      providers: [...config.providers],
      modelsByProvider,
    },
  };
}
