import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { ChatSession } from "./types";

interface CodexCachedModel {
  slug?: string;
  visibility?: string;
  default_reasoning_level?: string;
  supported_reasoning_levels?: Array<{ effort?: string }>;
  service_tiers?: Array<{ id?: string; name?: string }>;
}

interface CodexModelsCache {
  models?: CodexCachedModel[];
}

interface CodexRuntimeModel {
  id: string;
  defaultEffort: string;
  supportedEfforts: string[];
  supportsFast: boolean;
}

export interface CodexResumeDefaults {
  model?: string;
  effort?: string;
  fastMode?: boolean;
  personality?: "none" | "friendly" | "pragmatic";
  modelVerbosity?: "low" | "medium" | "high";
  reasoningSummary?: "auto" | "concise" | "detailed" | "none";
}

function codexDataRootFromSession(session: ChatSession): string {
  const marker = "/sessions/";
  const markerIndex = session.sourcePath.lastIndexOf(marker);
  if (markerIndex >= 0) return session.sourcePath.slice(0, markerIndex);
  return expandHome(process.env.CODEX_HOME || "~/.codex");
}

function loadCodexRuntimeModels(session: ChatSession): CodexRuntimeModel[] {
  try {
    const cachePath = join(codexDataRootFromSession(session), "models_cache.json");
    const cache = JSON.parse(readFileSync(cachePath, "utf8")) as CodexModelsCache;
    return (cache.models || [])
      .filter((model) => model.slug && model.visibility !== "hide" && model.supported_reasoning_levels?.length)
      .map((model) => {
        const supportedEfforts = (model.supported_reasoning_levels || [])
          .map((level) => level.effort)
          .filter((effort): effort is string => Boolean(effort));
        return {
          id: model.slug as string,
          defaultEffort: model.default_reasoning_level || supportedEfforts[0] || "medium",
          supportedEfforts,
          supportsFast: (model.service_tiers || []).some(
            (tier) => tier.id === "priority" || tier.name?.toLocaleLowerCase() === "fast",
          ),
        };
      });
  } catch {
    return [];
  }
}

export function resolveCodexResumeDefaults(session: ChatSession): CodexResumeDefaults {
  const configured = readCodexTopLevelConfig(session);
  const models = loadCodexRuntimeModels(session);
  const configuredPersonality = allowedValue(configured.personality, ["none", "friendly", "pragmatic"]);
  const configuredVerbosity = allowedValue(configured.model_verbosity, ["low", "medium", "high"]);
  const configuredSummary = allowedValue(configured.model_reasoning_summary, ["auto", "concise", "detailed", "none"]);
  if (models.length === 0) {
    return {
      model: session.model || configured.model,
      effort: configured.model_reasoning_effort,
      fastMode: configured.service_tier === "fast",
      personality: configuredPersonality,
      modelVerbosity: configuredVerbosity,
      reasoningSummary: configuredSummary,
    };
  }

  const selectedModel =
    models.find((model) => model.id === session.model) ||
    models.find((model) => model.id === configured.model) ||
    models[0];
  const configuredEffort = configured.model_reasoning_effort;
  const effort =
    (configuredEffort && selectedModel.supportedEfforts.includes(configuredEffort) && configuredEffort) ||
    (selectedModel.supportedEfforts.includes("xhigh") && "xhigh") ||
    selectedModel.defaultEffort;

  return {
    model: selectedModel.id,
    effort,
    fastMode: configured.service_tier === "fast" && selectedModel.supportsFast,
    personality: configuredPersonality,
    modelVerbosity: configuredVerbosity,
    reasoningSummary: configuredSummary,
  };
}

export function codexModelSupportsFast(session: ChatSession, modelId?: string): boolean {
  if (!modelId) return false;
  return Boolean(loadCodexRuntimeModels(session).find((model) => model.id === modelId)?.supportsFast);
}

function readCodexTopLevelConfig(session: ChatSession): Record<string, string> {
  try {
    const contents = readFileSync(join(codexDataRootFromSession(session), "config.toml"), "utf8");
    const topLevel = contents.split(/^\s*\[/m, 1)[0];
    const values: Record<string, string> = {};
    for (const line of topLevel.split("\n")) {
      const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*["']([^"']+)["']\s*(?:#.*)?$/);
      if (match) values[match[1]] = match[2];
    }
    return values;
  } catch {
    return {};
  }
}

function expandHome(sourcePath: string): string {
  if (sourcePath === "~") return homedir();
  if (sourcePath.startsWith("~/")) return join(homedir(), sourcePath.slice(2));
  return sourcePath;
}

function allowedValue<const Value extends string>(
  value: string | undefined,
  values: readonly Value[],
): Value | undefined {
  return value && values.includes(value as Value) ? (value as Value) : undefined;
}
