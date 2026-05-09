import fs from "node:fs/promises";
import path from "node:path";
import { getModels } from "@mariozechner/pi-ai";
import YAML from "yaml";
import { fileExists } from "./config.js";
import { PROVIDER_ID, PROVIDER_NAME, raycastProvidersPath } from "./paths.js";

export type ProviderInstallResult = {
  path: string;
  backupPath?: string;
};

type RaycastProvider = {
  id: string;
  name: string;
  base_url: string;
  api_keys: Record<string, string>;
  models: Array<{
    id: string;
    name: string;
    provider?: string;
    context?: number;
    abilities?: {
      temperature?: { supported: boolean };
      vision?: { supported: boolean };
      system_message?: { supported: boolean };
      tools?: { supported: boolean };
      reasoning_effort?: { supported: boolean };
    };
  }>;
};

type ProvidersYaml = {
  providers?: RaycastProvider[];
};

type RaycastModel = RaycastProvider["models"][number];

function toRaycastModel(model: {
  id: string;
  name?: string;
  contextWindow?: number;
  input?: string[];
  reasoning?: boolean;
}): RaycastModel {
  const input = Array.isArray(model.input) ? model.input : [];
  return {
    id: model.id,
    name: model.name ?? model.id,
    provider: PROVIDER_ID,
    context: model.contextWindow ?? 128000,
    abilities: {
      temperature: { supported: true },
      vision: { supported: input.includes("image") },
      system_message: { supported: true },
      tools: { supported: false },
      reasoning_effort: { supported: model.reasoning === true },
    },
  };
}

export function getOpenAICodexRaycastModels(): RaycastModel[] {
  const models = getModels("openai-codex").map(toRaycastModel);
  if (models.length > 0) {
    return models;
  }
  return [
    toRaycastModel({
      id: "gpt-5-codex",
      name: "GPT-5 Codex",
      contextWindow: 200000,
      input: ["text"],
      reasoning: true,
    }),
  ];
}

function makeProvider(baseUrl: string): RaycastProvider {
  return {
    id: PROVIDER_ID,
    name: PROVIDER_NAME,
    base_url: baseUrl,
    api_keys: {
      [PROVIDER_ID]: "not_needed",
    },
    models: getOpenAICodexRaycastModels(),
  };
}

function parseProviders(raw: string): ProvidersYaml {
  const parsed = YAML.parse(raw || "{}") as ProvidersYaml | null;
  if (!parsed || typeof parsed !== "object") {
    return {};
  }
  return parsed;
}

export async function installProvider(params: {
  port: number;
  providersPath?: string;
}): Promise<ProviderInstallResult> {
  const target = params.providersPath ?? raycastProvidersPath();
  await fs.mkdir(path.dirname(target), { recursive: true });

  let backupPath: string | undefined;
  let data: ProvidersYaml = {};
  if (await fileExists(target)) {
    const raw = await fs.readFile(target, "utf8");
    backupPath = `${target}.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
    await fs.copyFile(target, backupPath);
    data = parseProviders(raw);
  }

  const providers = Array.isArray(data.providers) ? data.providers : [];
  const nextProvider = makeProvider(`http://127.0.0.1:${params.port}/v1`);
  const nextProviders = providers.filter(
    (provider) => provider?.id !== PROVIDER_ID,
  );
  nextProviders.push(nextProvider);
  data.providers = nextProviders;

  await fs.writeFile(target, YAML.stringify(data), "utf8");
  return { path: target, backupPath };
}

export async function removeProvider(
  providersPath = raycastProvidersPath(),
): Promise<boolean> {
  if (!(await fileExists(providersPath))) {
    return false;
  }
  const data = parseProviders(await fs.readFile(providersPath, "utf8"));
  const providers = Array.isArray(data.providers) ? data.providers : [];
  const nextProviders = providers.filter(
    (provider) => provider?.id !== PROVIDER_ID,
  );
  if (nextProviders.length === providers.length) {
    return false;
  }
  data.providers = nextProviders;
  await fs.writeFile(providersPath, YAML.stringify(data), "utf8");
  return true;
}
